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

  // Create a svg element for the game board
  const svg = document.createElement("svg")
  svg.classList.add("game-board-svg")
  board.appendChild(svg)

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
    if (!cellButtons) initUI(game.cells, game.playerIds, yourPlayerId)

    cellButtons.forEach((button, i) => {
      const cellValue = game.cells[i]

      button.setAttribute(
        "player",
        (cellValue !== null
          ? // Set the player attribute to the index of the player in the playerIds array or 1 for bot
            game.playerIds.includes(cellValue)
            ? game.playerIds.indexOf(cellValue)
            : 1
          : -1
        ).toString()
      )
      button.setAttribute(
        "movable",
        // Movable pieces should be highlighted in yellow color.
        // Movable pieces are the ones that are of players turns and it cannot take any of the other players pieces.
        String(game.movableCellIndexes.includes(i))
      )

      button.setAttribute("selected", String(game.selectedCellIndex === i))

      button.setAttribute(
        "is-movable-destination",
        String(
          game.movableDestinations.some(
            (destination) => destination.destinationCellIndex === i
          )
        )
      )

      // Disable the button if it's not your turn
      if (
        (yourPlayerId !== cellValue && cellValue !== null) ||
        game.currentPlayerId !== yourPlayerId
      ) {
        button.setAttribute("disabled", "")
      } else {
        button.removeAttribute("disabled")
      }
    })

    playerContainers.forEach((container, i) => {
      container.setAttribute(
        "your-turn",
        String(game.playerIds[i] === game.currentPlayerId)
      )
    })

    if (action && action.name === "handleClick") selectSound.play()

    if (game.currentPlayerId === "bot") {
      // Check for game over
      if (new Set(game.cells).size === 2) {
        console.log("Game over!")
        return
      }
      console.log("Now, it's bot's turn.")
      const possibleMovableCells = Object.keys(
        game.possibleMovableDestinationsWithRemovableCellIndex
      )

      // Set the timeout only if the random cell is not selected
      if (game.selectedCellIndex === undefined) {
        // Get a random cell that can be clicked
        const randomCellIndex: number =
          +possibleMovableCells[
            Math.floor(Math.random() * possibleMovableCells.length)
          ]
        setTimeout(() => {
          // Trigger the handleClick action for the bot's turn
          const element = document.querySelector(
            `#board > button:nth-child(${randomCellIndex + 1})`
          )! as HTMLElement
          element.removeAttribute("disabled")
          element.click()
          console.log("performed click on element:", element)
          element.setAttribute("disabled", "")
        }, 1000)
      } else {
        console.log("The random cell is already selected.")
        // The random cell index would be selected, so move the cell to some random destination
        const possibleMovableDestinations =
          game.possibleMovableDestinationsWithRemovableCellIndex[
            game.selectedCellIndex
          ]

        // Get a random destination cell
        const randomDestinationCellIndex =
          possibleMovableDestinations[
            Math.floor(Math.random() * possibleMovableDestinations.length)
          ].destinationCellIndex

        // if the destination cell is not selected, select it
        if (game.selectedCellIndex !== randomDestinationCellIndex) {
          setTimeout(() => {
            // Trigger the handleClick action for the bot's turn
            const destinationElement = document.querySelector(
              `#board > button:nth-child(${randomDestinationCellIndex + 1})`
            )! as HTMLElement
            destinationElement.removeAttribute("disabled")
            destinationElement.click()
            destinationElement.setAttribute("disabled", "")
            console.log(
              "performed click on destination element:",
              destinationElement
            )
          }, 1000)
        }
        console.log("Bot's turn is over.")
      }
    }
  },
})
