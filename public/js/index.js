const socket = io()

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
canvas.width = 320
canvas.height = 240
c.fillRect(0, 0, canvas.width, canvas.height)

// Create background sprite
const background = new Sprite({
  position: {
    x: 0,
    y: 0
  },
  imageSrc: 'assets/1_1.png'
})

// Instantiate player
const frontEndPlayer = new Player({})
const frontEndPlayers = {}

// Update the client player based on backend data
socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    // If this player does not exist create it
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        position: {
          x: 0,
          y: 0
        },
        velocity: {
          x: 0,
          y: 0
        },
        imageSrc: 'assets/mario_anim.png',
        frameRate: 6
      })
    } else { // Else the player already exists

      // If this is the player update the player
      if (id === socket.id) {

        // TODO - clean up player movement (we aren't using velocity)
        frontEndPlayers[id].position.x = backEndPlayer.position.x
        frontEndPlayers[id].position.y = backEndPlayer.position.y

        frontEndPlayers[id].velocity.x = backEndPlayer.velocity.x
        frontEndPlayers[id].velocity.y = backEndPlayer.velocity.y

        // Server reconciliation
        // check that the backend recieved all inputs from the client...
        const lastBackendInputIndex = playerInputs.findIndex(input => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        // keep only unrecieved inputs
        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        // compensate accordingly for the amount of inputs missed
        playerInputs.forEach(input => {
          frontEndPlayers[id].x += input.dx // TODO - change how movement works
          frontEndPlayers[id].y += input.dy
        })

        // Update all other players that are not this client
      } else {
        // no server reconciliation here because all clients
        // will do this for their own movement respectively.

        frontEndPlayers[id].position.x = backEndPlayer.position.x
        frontEndPlayers[id].position.y = backEndPlayer.position.y

        frontEndPlayers[id].velocity.x = backEndPlayer.velocity.x
        frontEndPlayers[id].velocity.y = backEndPlayer.velocity.y
      }
    }
  }

  // If the frontend player does not exist on the backend...
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      delete frontEndPlayers[id] // delete it from the frontend.
    }
  }
})

// Animate the screen on the frontend
let animationId
function animate() {
  animationId = requestAnimationFrame(animate)

  background.draw()

  for (const id in frontEndPlayers) { // for each frontend player...
    const frontEndPlayer = frontEndPlayers[id]

    // draw the player.
    c.fillStyle = 'rgba(0, 255, 0, 0.2)'
    c.fillRect(frontEndPlayer.position.x, frontEndPlayer.position.y,
      frontEndPlayer.width, frontEndPlayer.height)
    frontEndPlayer.draw()
  }
}

animate()

// Is key currently pressed?
const keys = {
  a: {
    pressed: false
  },
  d: {
    pressed: false
  },
  w: {
    pressed: false
  }
}

// Keep track of player inputs and order for server reconciliation
const playerInputs = []
let sequenceNumber = 0

// Send key events to backend at given interval
setInterval(() => {
  if (keys.d.pressed) {
    sequenceNumber++ // increment input sequence number

    // push input to array player Inputs
    playerInputs.push({ sequenceNumber, dx: 5, dy: 0 })

    frontEndPlayers[socket.id].position.x += 5 // Client-side prediction
    // changing this value from the frontend 
    // does not determine player movement

    // Emit keydown event to server
    socket.emit('keydown', { keycode: 'd', sequenceNumber })
  }
  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -5, dy: 0 })
    frontEndPlayers[socket.id].position.x -= 5
    socket.emit('keydown', { keycode: 'a', sequenceNumber })
  }
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -5 })
    frontEndPlayers[socket.id].velocity.y = -5
    socket.emit('keydown', { keycode: 'w', sequenceNumber })
  }
}, 15)

// Keydown Event
window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return
  switch (event.key) {
    case 'd':
      keys.d.pressed = true
      break
    case 'a':
      keys.a.pressed = true
      break
    case 'w':
      keys.w.pressed = true
      break
  }
})

// Keyup Event
window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return
  switch (event.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break
    case 'w':
      keys.w.pressed = false
      break
  }
})

// Helper function to detect collisions between 2 objects
function isCollide(a, b) {
  return !(
    ((a.position.y + a.height) < (b.position.y)) ||
    (a.position.y > (b.position.y + b.height)) ||
    ((a.position.x + a.width) < b.position.x) ||
    (a.position.x > (b.position.x + b.width))
  );
}


