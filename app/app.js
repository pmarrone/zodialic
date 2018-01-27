var app = new PIXI.Application(800, 600, {backgroundColor : 0x000000});

document.body.appendChild(app.view);


const Textures = {
  node: PIXI.Texture.fromImage('/assets/images/node.png'),
  source: PIXI.Texture.fromImage('/assets/images/source.png'),
  package: PIXI.Texture.fromImage('/assets/images/package.png')
}

const Colors = {
  blue: 0x09B6FF,
  yellow: 0xF8FF09,
  orange: 0xE88D08,
  red: 0xFF040B,
  purple: 0xAB82E8
}


class Node {
  findNodeByAngle(x, y) {
    let largestDotProduct = null
    let target = null
    if (!this.dst.length) {
      throw "Can't find targeted node because there are no linked nodes!"
    }
    this.dst.forEach(current => {
      const normMouse = Utils.normalize({x: x - this.child.x, y: y - this.child.y})
      const normTarget = Utils.normalize({x: current.child.x - this.child.x, y: current.child.y - this.child.y})
      const dotProduct = Utils.dotProduct(normMouse, normTarget)
      if (largestDotProduct !== null && largestDotProduct > dotProduct) {
        return
      }
      else {
        largestDotProduct = dotProduct
        target = current
      }
    })

    //debugGraphics.lineStyle(4, 0xffd900, 1);
    //debugGraphics.drawCircle(target.child.x, target.child.y, 30)
    return target
  }

  pointerUp(event) {
    const mousePosition = event.data.global
    this.target = this.findNodeByAngle(mousePosition.x, mousePosition.y)
  }

  constructor(x, y) {
    const child = new PIXI.Sprite(Textures.node)
    child.interactive = true
    child.cursor = 'wait'
    // child.hitArea = new PIXI.Circle(0, 0, 25);
    this.child = child
    this.child.anchor.set(0.5)
    this.dst = []

    this.child.x = x
    this.child.y = y
    child.on('pointerdown', function(event) {

    })

    child.on('pointerupoutside', this.pointerUp.bind(this))
    child.on('pointerup', this.pointerUp.bind(this))
  }

  update(delta) {
    //this.child.x += Math.sin(new Date().getDate() / 100 + Math.random() * 6)
    //this.child.y += Math.sin(new Date().getDate() / 100 + Math.random() * 6)
    this.child.rotation = Math.atan2(this.target.child.y - this.child.y, this.target.child.x - this.child.x)
  }
}

class Package {
  constructor(currentNode, color) {
    this.color = color
    this.child = new PIXI.Sprite(Textures.package)
    this.child.tint = color
    this.child.x = currentNode.child.x
    this.child.y = currentNode.child.y
    this.child.anchor.set(0.5)
    this.currentNode = currentNode
    this.transition = 0
    this.targetNode = currentNode.target
    this.update = Package.states.inTransit
  }

  destroy () {
    game.removeComponent(this)
  }

  startTransition(target) {
    if (this.update === Package.states.inTransit) {
      console.log("Can't move. Already in transit.")
    } else {
      this.transition = 0
      this.targetNode = target
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
    this.transition +=  delta * 0.01 * game.speed
    const box = this.child
    if (this.transition >= 1) {
      this.transition = 1
      console.log("Done!")
      this.currentNode = this.targetNode
      this.update = Package.states.idle

      this.currentNode.packageArrived && this.currentNode.packageArrived(this)

      setTimeout(() => {
        this.startTransition(this.currentNode.target)
      }, 200)

    }
    box.x = Utils.lerp(this.currentNode.child.x, this.targetNode.child.x, this.transition)
    box.y = Utils.lerp(this.currentNode.child.y, this.targetNode.child.y, this.transition)
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
    line.lineStyle(4, 0xffd900, 1);
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
    } else {
      console.log("Packaged arrived at the wrong location")
    }
    packet.destroy()
  }
}

class Game {
  constructor() {
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
}

class Delivery {
  constructor(fromNode, color, sinceNow) {
    this.fromNode = fromNode,
    this.color = color,
    this.sinceNow = sinceNow
  }
}

class PackageScheduler {
  constructor() {
    this.deliveries = []
  }

  scheduleNext() {
    if (this.deliveries.length) {
      const current = this.deliveries.shift()
      setTimeout(function() {
        game.addComponent(new Package(current.fromNode, current.color))
        this.scheduleNext()
      }.bind(this), current.sinceNow / game.speed)
    }
  }

  start() {
    this.scheduleNext()
  }
}


const scheduler = new PackageScheduler();

function initLevel1() {
  const sources = {
    s1: new Source(400, 50, Colors.blue),
    s2: new Source(600, 500, Colors.red),
    s3: new Source(30, 500, Colors.yellow)
  }
  const nodes = {
    a: new Node(200, 500),
    b: new Node(400, 400),
    c: new Node(200, 200),
    d: new Node(500, 200)
  }
  const arcs = [
    new Arc(nodes.a, nodes.b),
    new Arc(nodes.b, nodes.c),
    new Arc(nodes.c, nodes.a),
    new Arc(nodes.c, nodes.d),
    new Arc(sources.s1, nodes.d),
    new Arc(sources.s2, nodes.a),
    new Arc(sources.s3, nodes.c)
  ]
  const packages = [
    new Package(nodes.a,Colors.blue),
  //  new Package(nodes.b),
  //  new Package(nodes.c)
  ]

  scheduler.deliveries.push(
    new Delivery(sources.s1, Colors.blue, 1000),
    new Delivery(sources.s3, Colors.red, 2000),
    new Delivery(sources.s2, Colors.yellow, 2000),
    new Delivery(sources.s3, Colors.red, 1000),
    new Delivery(sources.s2, Colors.blue, 2000),
    new Delivery(sources.s1, Colors.red, 3000),
    new Delivery(sources.s2, Colors.blue, 1000),
    new Delivery(sources.s1, Colors.yellow, 1000),
    new Delivery(sources.s3, Colors.red, 2000),
    new Delivery(sources.s1, Colors.blue, 1000),
    new Delivery(sources.s3, Colors.red, 2000),
    new Delivery(sources.s2, Colors.yellow, 2000),
    new Delivery(sources.s3, Colors.red, 1000),
    new Delivery(sources.s2, Colors.blue, 2000),
    new Delivery(sources.s1, Colors.red, 2000),
    new Delivery(sources.s2, Colors.blue, 4000),
    new Delivery(sources.s1, Colors.yellow, 1000),
    new Delivery(sources.s3, Colors.red, 3000)
  )
  scheduler.scheduleNext()


  return {
    sources,
    nodes,
    arcs,
    packages
  }
}

const game = new Game()

const debugGraphics = new PIXI.Graphics()

app.stage.addChild(debugGraphics)

const level1 = initLevel1()

level1.arcs.forEach(arc => {
  game.addComponent(arc)
})
for (let source in level1.sources) {
  game.addComponent(level1.sources[source])
}
for (let node in level1.nodes) {
  game.addComponent(level1.nodes[node])
}
level1.packages.forEach(package => {
  game.addComponent(package)
})


spaceKey = keyboard(keyCodes.SPACE)
aKey = keyboard(keyCodes.A)

spaceKey.press = function () {
  debugGraphics.clear()
}
aKey.press = () => {
  console.log("Doing stuff?")
  const package = level1.packages[0]
  package.startTransition(package.currentNode.target)
}


// Listen for animate update

