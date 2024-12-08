import type { PlayerId, RuneClient, GameOverResult } from "rune-sdk"

export type Cells = (PlayerId | null)[]
export type RemovableCellIndexWithDestinationCellIndex = {
  removableCellIndex: number
  destinationCellIndex: number
}
export interface GameState {
  cells: Cells
  lastMovePlayerId: PlayerId
  currentPlayerId: PlayerId
  playerIds: PlayerId[]
  freeCells?: boolean
  movableCellIndexes: number[]
  selectedCellIndex?: number
  movableDestinations: RemovableCellIndexWithDestinationCellIndex[]
  possibleMovableDestinationsWithRemovableCellIndex: {
    [cellIndex: number]: RemovableCellIndexWithDestinationCellIndex[]
  }
  initCall: boolean
  started: boolean
  spectatorPlayerId: PlayerId | undefined
}

type GameActions = {
  handleClick: (cellIndex: number) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

function checkForGameOver(cells: Cells) {
  // Check if the unique count is 2 which contains null and any one of the opponent cells.
  const uniqueCount = new Set(cells).size

  return uniqueCount === 2
}

const getNeighborsIndexes = (cellIndex: number): number[] => {
  const gridSize = 5 // Fixed size of the grid (5x5)
  const neighbors: number[] = []

  // Calculate row and column of the cell
  const row = Math.floor(cellIndex / gridSize)
  const col = cellIndex % gridSize

  // Add direct neighbors (up, down, left, right)
  if (col > 0) neighbors.push(cellIndex - 1) // Left
  if (col < gridSize - 1) neighbors.push(cellIndex + 1) // Right
  if (row > 0) neighbors.push(cellIndex - gridSize) // Up
  if (row < gridSize - 1) neighbors.push(cellIndex + gridSize) // Down

  // Add diagonal neighbors only if cellIndex % 2 === 0
  if (cellIndex % 2 === 0) {
    if (row > 0 && col > 0) neighbors.push(cellIndex - gridSize - 1) // Top-left
    if (row > 0 && col < gridSize - 1) neighbors.push(cellIndex - gridSize + 1) // Top-right
    if (row < gridSize - 1 && col > 0) neighbors.push(cellIndex + gridSize - 1) // Bottom-left
    if (row < gridSize - 1 && col < gridSize - 1)
      neighbors.push(cellIndex + gridSize + 1) // Bottom-right
  }

  return neighbors
}

// Get all the cells that can take out opponent cells
const getCellsThatCanTakeOutOpponentCells = (
  currentPlayerCells: number[],
  cellIndexNeighborsMapping: { [cellIndex: number]: number[] },
  cells: Cells
): { [cellIndex: number]: RemovableCellIndexWithDestinationCellIndex[] } => {
  const possibleMovableDestinationsWithRemovableCellIndex: {
    [cellIndex: number]: RemovableCellIndexWithDestinationCellIndex[]
  } = {}

  // For each of the current player cells, check if any of the cell can take out opponent cells
  for (let i = 0; i < currentPlayerCells.length; i++) {
    const cellIndex = currentPlayerCells[i]
    const neighbors = cellIndexNeighborsMapping[cellIndex]
    for (let j = 0; j < neighbors.length; j++) {
      const neighborIndex = neighbors[j]
      // Continue if neighbor is null or belongs to same piece
      if (
        cells[neighborIndex] === null ||
        cells[neighborIndex] === cells[cellIndex]
      )
        continue

      // Get the row and column of the neighborIndex
      const neighborRow = Math.floor(neighborIndex / 5)
      const neighborCol = neighborIndex % 5

      // Get the row and column of the cellIndex
      const cellRow = Math.floor(cellIndex / 5)
      const cellCol = cellIndex % 5

      // Get the difference between the cellIndex and the neighborIndex
      const rowDiff = neighborRow - cellRow
      const colDiff = neighborCol - cellCol

      const neighborNeighborsRow = neighborRow + rowDiff
      const neighborNeighborsCol = neighborCol + colDiff

      // Check if the neighborNeighborsRow and neighborNeighborsCol are within the bounds of the grid
      if (
        neighborNeighborsRow < 0 ||
        neighborNeighborsRow > 4 ||
        neighborNeighborsCol < 0 ||
        neighborNeighborsCol > 4
      )
        continue

      const neighborsNeighbor = neighborNeighborsRow * 5 + neighborNeighborsCol

      // Check if the cellIndex position is able to access the neighborNeighborIndex with diff
      if (
        cells[neighborsNeighbor] === null &&
        !currentPlayerCells.includes(neighborIndex) &&
        cells[neighborIndex] !== null
      ) {
        if (!possibleMovableDestinationsWithRemovableCellIndex[cellIndex]) {
          possibleMovableDestinationsWithRemovableCellIndex[cellIndex] = []
        }
        possibleMovableDestinationsWithRemovableCellIndex[cellIndex].push({
          removableCellIndex: neighborIndex,
          destinationCellIndex: neighborsNeighbor,
        })
      }
    }
  }

  return possibleMovableDestinationsWithRemovableCellIndex
}

const getMovableCellIndexes = (
  currentPlayerCells: number[],
  cells: Cells,
  cellIndexNeighborsMapping: { [cellIndex: number]: number[] }
): number[] => {
  const movableCellIndexes: number[] = []

  // If there are no movable cells which contains cells that can take out opponent cells, then select only neighbors which are null.
  for (let i = 0; i < currentPlayerCells.length; i++) {
    const cellIndex = currentPlayerCells[i]
    const neighbors = cellIndexNeighborsMapping[cellIndex]
    for (let j = 0; j < neighbors.length; j++) {
      const neighborIndex = neighbors[j]
      if (cells[neighborIndex] === null) {
        movableCellIndexes.push(cellIndex)
        break
      }
    }
  }

  return movableCellIndexes
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 2,
  setup: (allPlayerIds) => ({
    cells: new Array(25)
      .fill(allPlayerIds.length === 1 ? "bot" : allPlayerIds[1], 0, 12)
      .fill(null, 12, 13)
      .fill(allPlayerIds[0], 13, 25),
    lastMovePlayerId: allPlayerIds.length === 1 ? "bot" : allPlayerIds[1],
    currentPlayerId: allPlayerIds[0],
    playerIds: allPlayerIds,
    movableCellIndexes: [13, 16, 17, 18],
    movableDestinations: [],
    possibleMovableDestinationsWithRemovableCellIndex: {
      13: [{ removableCellIndex: -1, destinationCellIndex: 12 }],
      16: [{ removableCellIndex: -1, destinationCellIndex: 12 }],
      17: [{ removableCellIndex: -1, destinationCellIndex: 12 }],
      18: [{ removableCellIndex: -1, destinationCellIndex: 12 }],
    },
    initCall: true,
    started: false,
    spectatorPlayerId: undefined,
  }),
  actions: {
    handleClick: (cellIndex, { game }) => {
      // The clicked cell should be movable or present in movable destinations
      if (
        !game.movableCellIndexes.includes(cellIndex) &&
        !game.movableDestinations.some(
          (element) => element.destinationCellIndex === cellIndex
        )
      ) {
        return
      }

      // If the clicked cell is in movable destinations
      if (
        game.movableDestinations.some(
          (element) => element.destinationCellIndex === cellIndex
        )
      ) {
        // Set the game started to true as the first move has been made
        game.started = true
        // Update the last move player to the current player
        game.lastMovePlayerId = game.currentPlayerId
        // Update the current player to the next player
        game.currentPlayerId =
          game.currentPlayerId === game.playerIds[0]
            ? game.playerIds.length === 1
              ? "bot"
              : game.playerIds[1]
            : game.playerIds[0]
        // Move the cell to the new destination
        game.cells[cellIndex] = game.cells[game.selectedCellIndex || 0]
        // Remove the selected cell
        game.cells[game.selectedCellIndex || 0] = null
        // Update the movable destinations
        game.movableDestinations = []

        // Get the possible movable destinations of the selected cell
        const possibleMovableDestinations =
          game.possibleMovableDestinationsWithRemovableCellIndex[
            game.selectedCellIndex || 0
          ]

        // If the possible movable destinations exist, then remove the opponent cell from the board.
        if (possibleMovableDestinations) {
          for (let i = 0; i < possibleMovableDestinations.length; i++) {
            if (
              possibleMovableDestinations[i].destinationCellIndex === cellIndex
            ) {
              if (possibleMovableDestinations[i].removableCellIndex !== -1) {
                game.cells[possibleMovableDestinations[i].removableCellIndex] =
                  null
              }
              break
            }
          }
        }

        // For each cell of the playerId check if there are any cells which can take opponent cells.
        const currentPlayerCells = game.cells.reduce<number[]>(
          (acc, cell, cellIndex) => {
            if (cell === game.currentPlayerId) {
              acc.push(cellIndex)
            }
            return acc
          },
          []
        )

        // Get the neighbors of each cell that belongs to the current player
        const cellIndexNeighborsMapping: { [cellIndex: number]: number[] } = {}

        for (let i = 0; i < currentPlayerCells.length; i++) {
          const cellIndex = currentPlayerCells[i]
          cellIndexNeighborsMapping[cellIndex] = getNeighborsIndexes(cellIndex)
        }

        // Get the next movable cellIndexes
        const cellIndexesWithMovableDestinations: {
          [cellIndex: number]: RemovableCellIndexWithDestinationCellIndex[]
        } = getCellsThatCanTakeOutOpponentCells(
          currentPlayerCells,
          cellIndexNeighborsMapping,
          game.cells
        )

        if (Object.keys(cellIndexesWithMovableDestinations).length === 0) {
          // As there are no movable cells that can take out opponent cells, update the movable cellIndexes to empty neighbors
          const emptyNeighbors: number[] = getMovableCellIndexes(
            currentPlayerCells,
            game.cells,
            cellIndexNeighborsMapping
          )

          game.movableCellIndexes = emptyNeighbors
          game.possibleMovableDestinationsWithRemovableCellIndex = {}
          for (let i = 0; i < emptyNeighbors.length; i++) {
            game.possibleMovableDestinationsWithRemovableCellIndex[
              emptyNeighbors[i]
            ] = []
            // Get the empty neighbors of the neighbors
            const neighbors = cellIndexNeighborsMapping[emptyNeighbors[i]]
            for (let j = 0; j < neighbors.length; j++) {
              if (game.cells[neighbors[j]] === null) {
                game.possibleMovableDestinationsWithRemovableCellIndex[
                  emptyNeighbors[i]
                ].push({
                  destinationCellIndex: neighbors[j],
                  removableCellIndex: -1,
                })
              }
            }
          }
        } else {
          game.movableCellIndexes = Object.keys(
            cellIndexesWithMovableDestinations
          ).map((cellIndex) => Number(cellIndex))
          game.possibleMovableDestinationsWithRemovableCellIndex =
            cellIndexesWithMovableDestinations
        }

        game.selectedCellIndex = undefined

        if (checkForGameOver(game.cells)) {
          let playerOptions: { [playerId: string]: GameOverResult } = {}

          if (game.currentPlayerId === "bot") {
            playerOptions[game.lastMovePlayerId] = "WON"
            if (game.spectatorPlayerId !== undefined) {
              playerOptions[game.spectatorPlayerId] = "LOST"
            }
          } else if (game.lastMovePlayerId === "bot") {
            playerOptions[game.currentPlayerId] = "LOST"
            if (game.spectatorPlayerId !== undefined) {
              playerOptions[game.spectatorPlayerId] = "WON"
            }
          } else {
            playerOptions[game.currentPlayerId] = "LOST"
            playerOptions[game.lastMovePlayerId] = "WON"
          }

          Rune.gameOver({
            players: playerOptions,
          })
        }
        return
      }

      // The clicked cell should be selected to distinguish that it is selected.
      game.selectedCellIndex = cellIndex

      // Use the selected cell to get the movable destinations
      if (game.possibleMovableDestinationsWithRemovableCellIndex) {
        game.movableDestinations =
          game.possibleMovableDestinationsWithRemovableCellIndex[
            game.selectedCellIndex
          ].map((element) => {
            return {
              destinationCellIndex: element.destinationCellIndex,
              removableCellIndex: element.removableCellIndex,
            }
          })
      }
    },
  },
  events: {
    playerJoined: (playerId, { game }) => {
      // If the game has not yet started, then add the player to the game once he joins.
      if (game.playerIds.length === 1 && !game.started) {
        game.playerIds.push(playerId)
        game.lastMovePlayerId = playerId
        // Replace all the cell values from bot to the playerId
        game.cells = game.cells.map((cell) => {
          if (cell === "bot") {
            return playerId
          }
          return cell
        })
      } else {
        game.spectatorPlayerId = playerId
        console.log("Have to set the playerId to spectatorPlayerId")
        // Rune.gameOver({
        //   players: {
        //     [playerId]: "TIE",
        //     [game.playerIds[0]]: "TIE",
        //   },
        // })
      }
    },
  },
})
