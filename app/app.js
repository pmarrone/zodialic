var app = new PIXI.Application(1024, 768, {backgroundColor : 0x00000000});

document.body.appendChild(app.view);



class Package {
  constructor(currentRouter, color) {
    this.color = color
    this.child = new PIXI.extras.AnimatedSprite(Textures.normalMovementFrames)
    this.child.animationSpeed = 0.7
    this.child.loop = true
    this.child.play()
    
    this.child.tint = color
    this.child.scale.x  = .7
    this.child.scale.y  = .7
    this.child.x = currentRouter.child.x
    this.child.y = currentRouter.child.y
    this.child.anchor.set(0.5)
    this.currentRouter = currentRouter
    this.transition = 0
    this.targetRouter = currentRouter.target
    this.update = Package.states.inTransit
  }

  get x() {
    return this.child.x
  }

  
  get y() {
    return this.child.y
  }
  
  notifyDelivery() {
    game.currentLevel.packageDelivered()
  }

  destroy () {
    game.currentLevel.packageDestroyed()
    game.removeComponent(this)
  }

  startTransition(target) {
    if (this.update === Package.states.inTransit) {
      console.log("Can't move. Already in transit.")
    } else {
      this.transition = 0
      this.targetRouter = target
      this.update = Package.states.inTransit
    }
  }
}

Package.states = {
  idle: function (delta) {
    //noop
  },
  inTransit: function (delta) {
    // console.log(`In transit!! Transition: ${this.transition}`)
    this.transition += delta * 0.02 * game.speed
    const box = this.child
    if (this.transition >= 1) {
      this.transition = 1
      console.log("Done!")
      this.currentRouter = this.targetRouter
      this.update = Package.states.idle
      this.currentRouter.packageArrived && this.currentRouter.packageArrived(this)
    }
    box.x = Utils.lerp(this.currentRouter.child.x, this.targetRouter.child.x, this.transition)
    box.y = Utils.lerp(this.currentRouter.child.y, this.targetRouter.child.y, this.transition)
  }
}

class Arc {
  constructor(a, b) {
    this.child = new PIXI.Graphics()
    this.line = this.child
    this.line.z -= 10000
    this.a = a
    this.b = b
    a.dst.push(b)
    if (!a.target) {
      a.target = b
    }
    b.dst.push(a)
    if (!b.target) {
      b.target = a
    }
  }

  draw() {
    const line = this.line, a = this.a, b = this.b
    line.clear()
    line.lineStyle(4, 0x0000d9, 1);
    line.moveTo(a.child.x, a.child.y)
    line.lineTo(b.child.x, b.child.y)
  }
}

class Source {
  constructor(x, y, color) {
    this.color = color
    this.child = new PIXI.Sprite(Textures.source)
    this.child.x = x 
    this.child.y = y 
    this.child.anchor.set(0.5)
    this.dst = []
    this.child.tint = color
  }

  update(delta) {
    // this.child.rotation += 0.1 * delta
  }

  packageArrived(packet) {
    if (packet.color === this.color) {
      console.log("Packet arrived correctly")
      new BlueExplosion(packet.x, packet.y)
      packet.notifyDelivery()
      new LoseExplosion(packet.x, packet.y,packet.color)
      packet.notifyDelivery()
    } else {
      console.log("Packaged arrived at the wrong location")
      new WinExplosion(packet.x, packet.y, packet.color)
    }
    packet.destroy()
  }
}

class Game {
  constructor() {
    this.currentLevel = null
    this.speed = 1
    this.toRemove = []
    this.components = []
    app.ticker.add(delta => {
      this.update(delta)
    });
  }
  addComponent(component) {
    if (component.child) {
      app.stage.addChild(component.child)
    }
    this.components.push(component)
  }

  removeComponent(component) {
    this.toRemove.push(component)
    app.stage.removeChild(component.child)
  }

  update(delta) {
    this.components.forEach(component => {
      if (component.update) {
        component.update(delta)
      }

      if (component.draw) {
        component.draw()
      }
    })

    while (this.toRemove.length) {
      const nextToRemove = this.toRemove.shift()
      this.components.splice(this.components.indexOf(nextToRemove), 1);
    }
  }

  startGame(level = 1) {
    this.components = []
    app.stage.removeChildren()
    let currentLevel = levels[level](scheduler, game)
    this.currentLevel = currentLevel
    this.levelIndex = level
    currentLevel.init()
  }
}
 
class Delivery {
  constructor(fromRouter, color, sinceNow) {
    this.fromRouter = fromRouter,
      this.color = color,
      this.sinceNow = sinceNow
  }
}

class PackageScheduler {
  constructor() {
    this.deliveries = []
    this.routers = {}
  }

  processTick() {
    this.processRoutersTick()
    this.processNextDeliveries()
  }

  processRoutersTick() {
    for (let i in this.routers) {
      this.routers[i].processTick()
    }
  }

  processNextDeliveries() {
    let processDeliveries = true
    while (this.deliveries.length && processDeliveries) {
      const current = this.deliveries[0]
      if (current.sinceNow <= 0) {
        this.deliveries.shift()
        game.addComponent(new Package(current.fromRouter, current.color))
      } else {
        current.sinceNow--
        processDeliveries = false
      } 
    }
  }

  start() {
    setInterval(() => this.processTick(), 1500)
  }
}

const game = new Game()

const debugGraphics = new PIXI.Graphics()
app.stage.addChild(debugGraphics)
const scheduler = new PackageScheduler();
scheduler.start()

// app.stage.addChild(new Menu(game))
game.startGame()

sKey = keyboard(keyCodes.S)
spaceKey = keyboard(keyCodes.SPACE)
aKey = keyboard(keyCodes.A)

spaceKey.press = function () {
  debugGraphics.clear()
}
aKey.press = () => {
  const package = level1.packages[0]
}

sKey.press = () => {
  scheduler.processRoutersTick()
  game.currentLevel.end()
  const level = (game.levelIndex + 1) % levels.length
  game.startGame(level)
}

class NormalMovement{
  constructor (x,y){
    

    // create an AnimatedSprite (brings back memories from the days of Flash, right ?)
    const normalMovement = new PIXI.extras.AnimatedSprite(normalMovementFrames);
  //   /*
  //    * An AnimatedSprite inherits all the properties of a PIXI sprite
  //    * so you can change its position, its anchor, mask it, etc
  //    */

    normalMovement.x = x;
    normalMovement.y = y;
    normalMovement.anchor.set(0.5);
    normalMovement.animationSpeed = 0.5;
    normalMovement.loop = false
    normalMovement.onComplete = function () {
      // app.stage.removeChild(normalMovement)
    }
    normalMovement.play();
    app.stage.addChild(normalMovement);

    // Animate the rotation
    app.ticker.add(function() {
      normalMovement.rotation += 0.01;
    });

  }
}

// Listen for animate update

