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
socket.on('updatePlayers', (backEndPlayers, delta) => {
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
				frameRate: 12 // TODO: FRAMERATE IS BROKEN FIX ITTTTT
			})
		} else { // Else the player already exists

			// If this is the player update the player
			if (id === socket.id) {

				frontEndPlayers[id].position.x = backEndPlayer.position.x
				frontEndPlayers[id].position.y = backEndPlayer.position.y

				frontEndPlayers[id].velocity.x = backEndPlayer.velocity.x
				frontEndPlayers[id].velocity.y = backEndPlayer.velocity.y
				//console.log('dx: %f, dy: %f', frontEndPlayers[id].velocity.x, frontEndPlayers[id].velocity.y)

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

let drawCollisions = false

// Animate the screen on the frontend
let animationId
function animate(timeStamp) {
	animationId = requestAnimationFrame(animate)

	background.draw()

	for (const id in frontEndPlayers) { // for each frontend player...
		const frontEndPlayer = frontEndPlayers[id]
		frontEndPlayer.draw()

		if (drawCollisions) {
			c.fillStyle = 'rgba(0, 255, 0, 0.5)'
			c.fillRect(frontEndPlayer.position.x,
				frontEndPlayer.position.y,
				frontEndPlayer.width,
				frontEndPlayer.height)
		}
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

// Conditional Events emitted to server at a set interval to relieve backend strain
setInterval(() => {
	if (!frontEndPlayers[socket.id]) return

	if (!keys.d.pressed && !keys.a.pressed) {
		socket.emit('stop', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now()})
	}
	if (keys.w.pressed && frontEndPlayers[socket.id].velocity.y === 0) {
		socket.emit('jump', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now()})
	}
}, 15)

// Keydown Event
window.addEventListener('keydown', (event) => {
	if (!frontEndPlayers[socket.id]) return

	if (event.key === 'd') {
		socket.emit('run', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now(), direction: 1 })
		keys.d.pressed = true
	}
	if (event.key === 'a') {
		socket.emit('run', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now(), direction: -1 })
		keys.a.pressed = true
	}
	if (event.key === 'w') {
		socket.emit('jump', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now()})
		keys.w.pressed = true
	}
	if (event.key === 'i') {
		drawCollisions = !drawCollisions
	}
})

// Keyup Event
window.addEventListener('keyup', (event) => {
	if (!frontEndPlayers[socket.id]) return

	if (event.key === 'd') {
		keys.d.pressed = false
		if (keys.a.pressed) {
			socket.emit('run', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now(), direction: -1 })
		}
	}
	if (event.key === 'a') {
		keys.a.pressed = false
		if (keys.d.pressed) {
			socket.emit('run', { anchor: { x: frontEndPlayers[socket.id].position.x, y: frontEndPlayers[socket.id].position.y }, timeStamp: Date.now(), direction: 1 })
		}
	}
	if (event.key === 'w') {
		keys.w.pressed = false
	}
})


