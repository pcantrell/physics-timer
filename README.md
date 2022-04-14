# PhysicsTimer

A game helper to provide consistent, stable physics system behavior across varying or mismatched framerates. More generally, you can use this library to make a particular event happen at a specific average rate when it needs to run as part of a cycle that runs at a different and/or unstable rate.

Features:

- Game engine agnostic
- Physics engine agnostic
- Graceful handling for varying framerates / temporary slowdowns
- Prevents large time jumps when game / system is temporarily paused
- Stabilization algorithm prevents jitter due to timer drift


## Purpose

### The Problem

Physics engines simulate the world in discete steps. Games update their graphics in discrete steps. An obvious (and common) approach, then, is to take one physics step per game update. This falls apart, however, when the game update does not run at a perfectly stable rate, or runs faster or slower than the game designers intended. 

To make the game always run at the same perceived speed, we want to make the physics engine handle varying framerates.

### Bad Solutions

One solution is to ignore the problem. The Phaser game engine, for example, ties itself by default to the screen refresh rate, assumes that rate is 60Hz, and then simply lets games run at double speed when the browser and monitor happen to support 120Hz, or lets games slow down if the system is slow.

Most physics engines allow a custom timestep. Another solution, then, is to measure actual time elapsed since the previous update, and ask the physics engine to take steps of variable size. The problem with this approach is that in almost all physics engines, running the same simulation in different-sized times steps _produces different results._ Thus if you take this approach, the behavior of the game — not the appearance, not the smoothness, but the actual game _behavior_ — will depend on the system performance. This can produce nonsensical results such as “the player can jump higher on slower systems.”

A third solution people often come up with is to try to make the physics system run concurrently with the rendering. Using this to achieve truly independent timing requires parallel execution, and Javascript does not support parallelism. (Even in languages that do, it is tricky to make this solution work well. Physics and rendering share a lot of data: the rendering code needs to read the positions of physics bodies. The resulting need for synchronization between physics and rendering thus makes it difficult for the timing of the two to be independent.)

### A Good Solution

- Run the physics inside the game’s update cycle, no concurrency.
- Always advance the physics simulation by the same fixed timestep.
- Vary the number of physics steps per update based on the observed speed of the update cycle.

So, for example, if you want a 60Hz physics update cycle:


| game update fps | resulting steps per update |
|-----------------|----------------------------|
| 60              | 1 1 1 1 …                  |
| 30              | 2 2 2 2 …                  |
| 120             | 1 0 1 0 …                  |
| 90              | 1 1 0 1 1 0 …              |
| unstable        | 1 0 1 2 1 …??…             |

Those last two scenarios will not look perfectly _smooth_, but they will at least create consistent _speed_.

This library achieves these different step-per-update patterns — even when physics rate and update rate are not tidy multiples of each other, and even when the update rate is unstable. This library also provides a simple algorithm that helps prevent jitter when the actual update rate is very close to but not exactly equal to the desired rate.


## Usage

In your game / scene setup, create an instance of `PhysicsTimer`, providing a callback that increases the physics system by a single fixed step:

```js
const physicsTimer = new PhysicsTimer(() => physicsSystem.step())
// (And disable game system’s automatic physics stepping if necessary)
```

There are a few options you can change when creating a `PhysicsTimer` (see source docs for details):

```js
new PhysicsTimer(() => physicsSystem.step(), {
    timePerStep: 1000 / 120,  // 120 physics updates per second (default: 60)
    maxTimePerUpdate: 500,    // Allow up to a 500ms time jump per update (default: 100)
    stabilizationFactor: 0.5  // Aggressive stabilization (default: 0.1)
})
````

Then in your update / animation / rendering cycle, call the `PhysicsTimer`’s `update` method:

```js
physicsTimer.update()
```

By default, `PhysicsTimer` uses the system clock (using the high-resolution Javascript time API if available, and falling back to old APIs if necessary). If your game system already provides a time delta, you can pass it:


```js
physicsTimer.update(dt)
```

Here is a more complete example of how to integrate this library with Matter physics engine in the Phaser game platform:


```js
import PhysicsTimer from 'physics-timer'

export default class ThrillingGameScene extends Phaser.Scene {
    private physicsTimer: PhysicsTimer

    create() {
        this.matter.world.autoUpdate = false  // ⚠️ Note we have to tell Phaser not to update physics for us
        this.physicsTimer = new PhysicsTimer(() => this.matter.world.step())
        ...
    }

    update(t: number, dt: number) {
        this.physicsTimer.update()  // You can pass dt to use Phaser's timer instead,
                                    // but I find using the system clock is smoother
        ...
    }
}
```


## Acknowledgements


Thanks to Cameron Nokes for the [helpful guide on publishing Typescript npm packages](https://cameronnokes.com/blog/the-30-second-guide-to-publishing-a-typescript-package-to-npm/). And thanks to my students for building cool stuff and giving me nice problems to help solve.
