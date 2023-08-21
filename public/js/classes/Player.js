class Player extends Sprite {
	constructor({ position, velocity, imageSrc, frameRate }) {
		super({ imageSrc, frameRate })
		this.position = position
		this.velocity = velocity
	}
}
