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

const playerInputs = []
const speed = 3
const jumpMultiplier = 1.5
const gravity = 0.2

let start = Date.now()
let drawCollisions = false

// Animate the screen on the frontend
let animationId
function animate(timeStamp) {
	animationId = requestAnimationFrame(animate)

	let currentTime = Date.now()
	let delta = ((currentTime - start)) / 15 // use delta to compensate for loop innacuracies

	// Client-side prediction
	if (frontEndPlayers[socket.id] != null) {
		frontEndPlayers[socket.id].position.x += (frontEndPlayers[socket.id].velocity.x * delta)

		// if player hits bottom of canvas stop velocity.y and set canJump
		if (frontEndPlayers[socket.id].position.y + 16 + frontEndPlayers[socket.id].velocity.y >= 240 - 32) {
			frontEndPlayers[socket.id].velocity.y = 0
			frontEndPlayers[socket.id].position.y = 240 - 32 - 16
		} else { // if player is still falling, player cannot jump
			frontEndPlayers[socket.id].velocity.y += gravity * delta
			frontEndPlayers[socket.id].position.y += (frontEndPlayers[socket.id].velocity.y * delta)
		}
	}
	start = currentTime


	// Animate Canvas
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
		socket.emit('stop', { timeStamp: Date.now() })
		frontEndPlayers[socket.id].velocity.x = lerp(frontEndPlayers[socket.id].velocity.x, 0, 0.3) // client-side prediction
		
	}
	if (keys.w.pressed && frontEndPlayers[socket.id].velocity.y === 0) {
		socket.emit('jump', { timeStamp: Date.now() })
		frontEndPlayers[socket.id].velocity.y = lerp(frontEndPlayers[socket.id].velocity.y, speed * jumpMultiplier, 0.8) // client-side prediction
	}
}, 15)

// Keydown Event
window.addEventListener('keydown', (event) => {
	if (!frontEndPlayers[socket.id]) return

	if (event.key === 'd') {
		let timeStamp = Date.now()
		playerInputs.push({ timeStamp, dx: speed, dy: 0 })
		frontEndPlayers[socket.id].velocity.x = lerp(frontEndPlayers[socket.id].velocity.x, speed, 0.8)  // client-side prediction
		socket.emit('run', { timeStamp, direction: 1 })
		keys.d.pressed = true
	}
	if (event.key === 'a') {
		let timeStamp = Date.now()
		playerInputs.push({ timeStamp, dx: -speed, dy: 0 })
		frontEndPlayers[socket.id].velocity.x = lerp(frontEndPlayers[socket.id].velocity.x, -speed, 0.8) // client-side prediction
		socket.emit('run', { timeStamp, direction: -1 })
		keys.a.pressed = true
	}
	if (event.key === 'w') {
		let timeStamp = Date.now()
		playerInputs.push({ timeStamp, dx: 0, dy: -speed })
		frontEndPlayers[socket.id].velocity.y = lerp(frontEndPlayers[socket.id].velocity.y, speed * jumpMultiplier, 0.8) // client-side prediction
		socket.emit('jump', { timeStamp })
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
			socket.emit('run', { timeStamp: Date.now(), direction: -1 })
		}
	}
	if (event.key === 'a') {
		keys.a.pressed = false
		if (keys.d.pressed) {
			socket.emit('run', { timeStamp: Date.now(), direction: 1 })
		}
	}
	if (event.key === 'w') {
		keys.w.pressed = false
	}
})

function lerp( a, b, alpha ) {
	return a + alpha * (b - a )
}


