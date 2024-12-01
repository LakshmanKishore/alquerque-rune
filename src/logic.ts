import type { PlayerId, DuskClient } from "dusk-games-sdk/multiplayer"

export type Cells = (PlayerId | null)[]
export type RemovableCellIndexWithDestinationCellIndex = {
  removableCellIndex: number
  destinationCellIndex: number
}
export interface GameState {
  cells: Cells
  winCombo: number[] | null
  lastMovePlayerId: PlayerId | null
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
}

type GameActions = {
  claimCell: (cellIndex: number) => void
  handleClick: (cellIndex: number) => void
  assignInitialCells: (cells: Cells) => void
}

declare global {
  const Dusk: DuskClient<GameState, GameActions>
}

function findWinningCombo(cells: Cells) {
  // only if all the cell elements are the same
  // Get the first non null value
  // const firstValue: PlayerId | null =
  //   cells.find((cell) => cell !== null) || null
  // return cells.every((cell) => cell === firstValue && cell !== null)
  //   ? firstValue
  // : null
  return (
    [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ].find((combo) =>
      combo.every((i) => cells[i] && cells[i] === cells[combo[0]])
    ) || null
  )
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
  // const movableCellIndexes: number[] = []
  const possibleMovableDestinationsWithRemovableCellIndex: {
    [cellIndex: number]: RemovableCellIndexWithDestinationCellIndex[]
  } = {}

  console.log("currentPlayerCells", currentPlayerCells)

  console.log("cellIndexNeighborsMapping", cellIndexNeighborsMapping)

  // For each of the current player cells, check if any of the cell can take out opponent cells
  for (let i = 0; i < currentPlayerCells.length; i++) {
    const cellIndex = currentPlayerCells[i]
    const neighbors = cellIndexNeighborsMapping[cellIndex]
    for (let j = 0; j < neighbors.length; j++) {
      const neighborIndex = neighbors[j]
      // Now check if the neighbor's neighbor has any opponent cells
      // const neighborNeighbors = getNeighborsIndexes(neighborIndex)
      // console.log("neigborindex", neighborIndex)
      // console.log("neighborNeighbors", neighborNeighbors)

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

      const neighborsNeighbor = neighborNeighborsRow * 5 + neighborNeighborsCol

      // Get the difference between the cellIndex and the neighborIndex
      // const diff = neighborIndex - cellIndex

      // const neighborsNeighbor = neighborIndex + diff

      console.log("neighborIndex", neighborIndex)
      console.log("neighborsNeighbor", neighborsNeighbor)

      // Check if the cellIndex position is able to access the neighborNeighborIndex with diff
      if (
        cells[neighborsNeighbor] === null &&
        !currentPlayerCells.includes(neighborIndex) &&
        cells[neighborIndex] !== null
      ) {
        // movableCellIndexes.push(cellIndex)
        // TODO: Update movableDestinations here with the cellIndex
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

  console.log(
    "first",
    JSON.stringify(possibleMovableDestinationsWithRemovableCellIndex)
  )

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

  console.log(":: currentPlayerCells", currentPlayerCells)
  console.log("movableCellIndexes", movableCellIndexes)

  return movableCellIndexes
}

Dusk.initLogic({
  minPlayers: 2,
  maxPlayers: 2,
  setup: (allPlayerIds) => ({
    cells: new Array(25)
      .fill(allPlayerIds[1], 0, 12)
      .fill(null, 12, 13)
      .fill(allPlayerIds[0], 13, 25),
    winCombo: null,
    lastMovePlayerId: allPlayerIds[1],
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
    initCall: false,
  }),
  actions: {
    assignInitialCells: (cells, { game }) => {
      game.initCall = true
      // Get the cells that belong to the current player
      const currentPlayerCells = cells.reduce<number[]>(
        (acc, cell, cellIndex) => {
          if (cell === game.currentPlayerId) {
            acc.push(cellIndex)
          }
          return acc
        },
        []
      )

      console.log("currentPlayerCells", currentPlayerCells)

      // Get the neighbors of each cell that belongs to the current player
      const cellIndexNeighborsMapping: { [cellIndex: number]: number[] } = {}

      for (let i = 0; i < currentPlayerCells.length; i++) {
        const cellIndex = currentPlayerCells[i]
        cellIndexNeighborsMapping[cellIndex] = getNeighborsIndexes(cellIndex)
      }

      game.movableCellIndexes = getMovableCellIndexes(
        currentPlayerCells,
        game.cells,
        cellIndexNeighborsMapping
      )
    },
    handleClick: (cellIndex, { game }) => {
      // The clicked cell should be movable or present in movable destinations
      if (
        !game.movableCellIndexes.includes(cellIndex) &&
        !game.movableDestinations.some(
          (element) => element.destinationCellIndex === cellIndex
        )
      ) {
        console.log("clicked on non movable cells")
        return
      }

      // If the clicked cell is in movable destinations
      if (
        game.movableDestinations.some(
          (element) => element.destinationCellIndex === cellIndex
        )
      ) {
        console.log("clicked on destination cells")
        // Update the current player to the next player
        game.currentPlayerId =
          game.currentPlayerId === game.playerIds[0]
            ? game.playerIds[1]
            : game.playerIds[0]
        game.cells[cellIndex] = game.cells[game.selectedCellIndex || 0]
        game.cells[game.selectedCellIndex || 0] = null
        game.movableDestinations = []

        console.log("cellIndex", cellIndex)
        console.log("game.selectedCellIndex", game.selectedCellIndex)

        const possibleMovableDestinations =
          game.possibleMovableDestinationsWithRemovableCellIndex[
            game.selectedCellIndex || 0
          ]

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

        console.log(
          "game.possibleMovableDestinationsWithRemovableCellIndex",
          game.possibleMovableDestinationsWithRemovableCellIndex[
            game.selectedCellIndex || 0
          ]
        )
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

        console.log(
          "cellIndexesWithMovableDestinations",
          cellIndexesWithMovableDestinations,
          Object.keys(cellIndexesWithMovableDestinations)
        )

        if (Object.keys(cellIndexesWithMovableDestinations).length === 0) {
          // As there are no movable cells that can take out opponent cells, update the movable cellIndexes to empty neighbors
          const emptyNeighbors: number[] = getMovableCellIndexes(
            currentPlayerCells,
            game.cells,
            cellIndexNeighborsMapping
          )

          game.movableCellIndexes = emptyNeighbors
          console.log("movableCellIndexes", game.movableCellIndexes)
          game.possibleMovableDestinationsWithRemovableCellIndex = {}
          for (let i = 0; i < emptyNeighbors.length; i++) {
            game.possibleMovableDestinationsWithRemovableCellIndex[
              emptyNeighbors[i]
            ] = []
            // Get the empty neighbors of the neighbors
            const neighbors = cellIndexNeighborsMapping[emptyNeighbors[i]]
            console.log("neighborrrrrs", neighbors)
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
          console.log(
            "game.possibleMovableDestinationsWithRemovableCellIndex",
            game.possibleMovableDestinationsWithRemovableCellIndex
          )
        } else {
          game.movableCellIndexes = Object.keys(
            cellIndexesWithMovableDestinations
          ).map((cellIndex) => Number(cellIndex))
          game.possibleMovableDestinationsWithRemovableCellIndex =
            cellIndexesWithMovableDestinations
        }

        game.selectedCellIndex = undefined
        // game.winCombo = findWinningCombo(game.cells)
        return
      }

      // The clicked cell should be selected to distinguish that it is selected.
      game.selectedCellIndex = cellIndex

      // Use the selected cell to get the movable destinations
      // game.movableDestinations = []
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
        // } else {
        //   // For each cell of the playerId check if there are any cells which can take opponent cells.
        //   const currentPlayerCells = game.cells.reduce<number[]>(
        //     (acc, cell, cellIndex) => {
        //       if (cell === game.currentPlayerId) {
        //         acc.push(cellIndex)
        //       }
        //       return acc
        //     },
        //     []
        //   )

        //   // Get the neighbors of each cell that belongs to the current player
        //   const cellIndexNeighborsMapping: { [cellIndex: number]: number[] } = {}

        //   for (let i = 0; i < currentPlayerCells.length; i++) {
        //     const cellIndex = currentPlayerCells[i]
        //     cellIndexNeighborsMapping[cellIndex] = getNeighborsIndexes(cellIndex)
        //   }

        //   game.movableDestinations = getMovableCellIndexes(
        //     currentPlayerCells,
        //     game.cells,
        //     cellIndexNeighborsMapping
        //   )
      }

      // // Highlight the destination cells for the selected cell
      // // Check if any neighbors are having opposite player cell and check it's neighbors for empty cells
      // const neighbors = getNeighborsIndexes(cellIndex)

      // const neighborsWithOppositePlayer = neighbors.filter((i) => {
      //   // Filter out all the null and the same player cell to get the neighbors with opposite player
      //   return game.cells[i] !== game.cells[cellIndex] && game.cells[i] !== null
      // })

      // console.log("neighborsWithOppositePlayer", neighborsWithOppositePlayer)

      // if (neighborsWithOppositePlayer.length > 0) {
      //   // Check if the neighbors neighbors are empty
      //   for (let i = 0; i < neighborsWithOppositePlayer.length; i++) {
      //     const neighborIndex = neighborsWithOppositePlayer[i]
      //     const neighborNeighbors = getNeighborsIndexes(neighborIndex)
      //     for (let j = 0; j < neighborNeighbors.length; j++) {
      //       if (game.cells[neighborNeighbors[j]] === null) {
      //         // game.movableDestinations.push(neighborNeighbors[j])
      //         game.movableDestinations.push({
      //           destinationCellIndex: neighborNeighbors[j],
      //           removableCellIndex: -1,
      //         })
      //       }
      //     }
      //   }
      // }

      // if (game.movableDestinations.length === 0) {
      //   for (let i = 0; i < neighbors.length; i++) {
      //     if (game.cells[neighbors[i]] === null) {
      //       game.movableDestinations.push({
      //         destinationCellIndex: neighbors[i],
      //         removableCellIndex: -1,
      //       })
      //     }
      //   }
      // }

      console.log("game.movableDestinations", game.movableDestinations)
    },
    claimCell: (cellIndex, { game, playerId, allPlayerIds }) => {
      if (
        game.cells[cellIndex] !== null ||
        playerId === game.lastMovePlayerId
      ) {
        throw Dusk.invalidAction()
      }

      game.cells[cellIndex] = playerId
      game.lastMovePlayerId = playerId
      game.winCombo = findWinningCombo(game.cells)

      if (game.winCombo) {
        const [player1, player2] = allPlayerIds

        Dusk.gameOver({
          players: {
            [player1]: game.lastMovePlayerId === player1 ? "WON" : "LOST",
            [player2]: game.lastMovePlayerId === player2 ? "WON" : "LOST",
          },
        })
      }

      game.freeCells = game.cells.findIndex((cell) => cell === null) !== -1

      if (!game.freeCells) {
        Dusk.gameOver({
          players: {
            [game.playerIds[0]]: "LOST",
            [game.playerIds[1]]: "LOST",
          },
        })
      }
    },
  },
})
