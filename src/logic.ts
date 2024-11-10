import type { PlayerId, DuskClient } from "dusk-games-sdk/multiplayer"

export type Cells = (PlayerId | null)[]
export interface GameState {
  cells: Cells
  winCombo: number[] | null
  lastMovePlayerId: PlayerId | null
  playerIds: PlayerId[]
  freeCells?: boolean
  movableCellIndexes: number[]
  selectedCellIndex?: number
  movableDestinations: number[]
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
  const neighbors = [cellIndex - 1, cellIndex + 1, cellIndex - 5, cellIndex + 5]

  // Check if cell can move diagonally
  if (cellIndex % 2 == 0) {
    neighbors.push(cellIndex - 6, cellIndex + 6)
    neighbors.push(cellIndex - 4, cellIndex + 4)
  }

  return neighbors
}

Dusk.initLogic({
  minPlayers: 2,
  maxPlayers: 2,
  setup: (allPlayerIds) => ({
    cells: new Array(25)
      .fill(allPlayerIds[1], 0, 12)
      .fill(allPlayerIds[0], 13, 25),
    winCombo: null,
    lastMovePlayerId: null,
    playerIds: allPlayerIds,
    movableCellIndexes: [13, 16, 17, 18],
    movableDestinations: [],
  }),
  actions: {
    assignInitialCells: (cells) => {
      console.log("assignInitialCells", cells)
    },
    handleClick: (cellIndex, { game }) => {
      // The clicked cell should be movable or present in movable destinations
      if (
        !game.movableCellIndexes.includes(cellIndex) &&
        !game.movableDestinations.includes(cellIndex)
      ) {
        console.log("clicked on non movable cells")
        return
      }

      console.log(
        "game.movableDestinations**************",
        game.movableDestinations.length,
        game.selectedCellIndex,
        game.movableDestinations
      )

      // If the clicked cell is in movable destinations
      if (game.movableDestinations.includes(cellIndex)) {
        console.log("clicked on destination cells")
        game.cells[cellIndex] = game.cells[game.selectedCellIndex || 0]
        game.cells[game.selectedCellIndex || 0] = null
        game.movableDestinations = []
        game.movableCellIndexes = [13]
        game.selectedCellIndex = undefined
        // game.winCombo = findWinningCombo(game.cells)
        return
      }

      // The clicked cell should be selected to distinguish that it is selected.
      game.selectedCellIndex = cellIndex

      // Highlight the destination cells for the selected cell
      // Check if any neighbors are having opposite player cell and check it's neighbors for emtpy cells
      const neighbors = getNeighborsIndexes(cellIndex)

      const neighborsWithOppositePlayer = neighbors.filter((i) => {
        if (i < 0 || i > 24) {
          return false
        }
        // Filter out all the null and the same player cell to get the neighbors with opposite player
        return game.cells[i] !== game.cells[cellIndex] && game.cells[i] === null
      })

      if (neighborsWithOppositePlayer.length > 0) {
        // Check if the neighbors neighbors are empty
        for (let i = 0; i < neighborsWithOppositePlayer.length; i++) {
          const neighborIndex = neighborsWithOppositePlayer[i]
          const neighborNeighbors = getNeighborsIndexes(neighborIndex)
          if (neighborNeighbors.every((i) => game.cells[i] === null)) {
            console.log("i", i)
            game.movableDestinations.push(i)
          }
        }
      }

      if (game.movableDestinations.length === 0) {
        game.selectedCellIndex = undefined
        game.movableDestinations = neighbors.filter((i) => {
          if (i < 0 || i > 24) {
            return false
          }
          return game.cells[i] === undefined
        })
      }

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
