class Sprite {
    constructor ({ position, imageSrc, frameRate = 1 }) {
        this.position = position
        this.image = new Image()
        this.frameRate = frameRate // constant representing number of frames on spritesheet
            // currently spritesheets must have y framerate of 1
        this.image.src = imageSrc
        this.image.onload = () => {
            this.width = this.image.width / this.frameRate
            this.height = this.image.height
        }
        this.currentFrame = 0
    }

    draw() {
        if (!this.image) return

        const cropbox = {
            position: {
                x: this.currentFrame * this.frameRate,
                y: 0
            },
            width: this.image.width / this.frameRate,
            height: this.image.height
        }

        c.drawImage(
            this.image, 
            cropbox.position.x, 
            cropbox.position.y, 
            cropbox.width,
            cropbox.height,
            this.position.x, 
            this.position.y,
            this.width,
            this.height
        )
    }
}