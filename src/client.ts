import "./styles.css"

import { PlayerId } from "dusk-games-sdk/multiplayer"

import selectSoundAudio from "./assets/select.wav"
import { Cells } from "./logic.ts"

const board = document.getElementById("board")!
const playersSection = document.getElementById("playersSection")!

const selectSound = new Audio(selectSoundAudio)

let cellButtons: HTMLButtonElement[], playerContainers: HTMLLIElement[]

function initUI(
  cells: Cells,
  playerIds: PlayerId[],
  yourPlayerId: PlayerId | undefined
) {
  cellButtons = cells.map((_, cellIndex) => {
    const button = document.createElement("button")
    button.addEventListener("click", () => Dusk.actions.handleClick(cellIndex))
    board.appendChild(button)

    return button
  })

  // Create a 4x4 table for the background lines
  const grid = document.createElement("table")
  for (let i = 0; i < 4; i++) {
    const row = document.createElement("tr")
    grid.appendChild(row)
    for (let j = 0; j < 4; j++) {
      const line = document.createElement("td")
      row.appendChild(line)
    }
  }
  board.appendChild(grid)

  // Create top-left to bottom-right diagonal
  const diagonalTLBR = document.createElement("div")
  diagonalTLBR.className = "diagonal-line tl-br"
  board.appendChild(diagonalTLBR)

  // Create bottom-left to top-right diagonal
  const diagonalBLTR = document.createElement("div")
  diagonalBLTR.className = "diagonal-line bl-tr"
  board.appendChild(diagonalBLTR)

  // Create a rhombus shape
  const rhombus = document.createElement("div")
  rhombus.className = "rhombus"
  board.appendChild(rhombus)

  playerContainers = playerIds.map((playerId, index) => {
    const player = Dusk.getPlayerInfo(playerId)

    const li = document.createElement("li")
    li.setAttribute("player", index.toString())
    li.innerHTML = `<img src="${player.avatarUrl}" />
           <span>${
             player.displayName +
             (player.playerId === yourPlayerId ? "<br>(You)" : "")
           }</span>`
    playersSection.appendChild(li)

    return li
  })
}

Dusk.initClient({
  onChange: ({ game, yourPlayerId, action }) => {
    const { cells, playerIds, winCombo, lastMovePlayerId, freeCells } = game

    console.log("cells", cells)
    console.log("cellButtons", cellButtons)
    // Print the current player turn
    console.log(
      "Player name:",
      Dusk.getPlayerInfo(yourPlayerId || "asdf").displayName
    )

    if (!cellButtons) initUI(cells, playerIds, yourPlayerId)

    if (lastMovePlayerId) board.classList.remove("initial")

    // const movablePieces = []

    // Logic to highlight movable pieces
    // for (let i = 0; i < cells.length; i++) {
    //   // const

    // }

    cellButtons.forEach((button, i) => {
      const cellValue = cells[i]

      button.setAttribute(
        "player",
        (cellValue !== null ? playerIds.indexOf(cellValue) : -1).toString()
      )
      button.setAttribute(
        "movable",
        // String((winCombo && !winCombo.includes(i)) || (!freeCells && !winCombo))
        // Movable pieces should be highlighted in yellow color.
        // Movable pieces are the ones that are of players turns and it cannot take any of the other players pieces.
        String(game.movableCellIndexes.includes(i))
      )

      button.setAttribute("selected", String(game.selectedCellIndex === i))

      button.setAttribute(
        "is-movable-destination",
        String(game.movableDestinations.includes(i))
      )

      // if (cells[i] || lastMovePlayerId === yourPlayerId || winCombo) {
      //   button.setAttribute("disabled", "")
      // } else {
      //   button.removeAttribute("disabled")
      // }
    })

    playerContainers.forEach((container, i) => {
      container.setAttribute(
        "your-turn",
        String(playerIds[i] !== lastMovePlayerId && !winCombo && freeCells)
      )
    })

    if (action && action.name === "claimCell") selectSound.play()
  },
})
