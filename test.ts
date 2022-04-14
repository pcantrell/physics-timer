import test from 'ava'
import PhysicsTimer from './index'

const physicsStepTest = test.macro((
	t,
	physicsOptions: any,
	testSequence: { dt: number, steps: number }[]
) => {
	let stepCount = 0
	const physics = new PhysicsTimer(() => stepCount++, physicsOptions)

	testSequence.forEach(({dt, steps}, index) => {
		stepCount = 0
		const result = physics.update(dt)
		const message = `at step ${index}  (dt = ${dt})`
		t.is(result, steps, message)
		t.is(stepCount, steps, message)
	})
})

// –––––– timePerStep ––––––

test('default is 60 fps', physicsStepTest, undefined,
	Array(10).fill({ dt: 1000/60, steps: 1}))

test('timePerStep can change', physicsStepTest, { timePerStep: 1 },
	Array(10).fill({ dt: 76, steps: 76 }))

// –––––– error propagation ––––––

test('multiple steps for low update rate', physicsStepTest, undefined, [
	{ dt: 1000/30, steps: 2 },
	{ dt: 1000/20, steps: 3 },
])

test('staggered steps for high update rate', physicsStepTest, undefined, [
	{ dt: 1000/120, steps: 1 },
	{ dt: 1000/120, steps: 0 },
	{ dt: 1000/120, steps: 1 },
	{ dt: 1000/120, steps: 0 },
	{ dt: 1000/120, steps: 1 },
])

// –––––– maxTimePerUpdate ––––––

test('maxTimePerUpdate defaults to 100ms', physicsStepTest, undefined,  [
	{ dt: Infinity, steps: 6 },
])

test('maxTimePerUpdate can change', physicsStepTest, { maxTimePerUpdate: 2000 },  [
	{ dt: Infinity, steps: 120 },
])

// –––––– stabilizationFactor ––––––

test('stabilization handles varying framerate', physicsStepTest, undefined, [
	...Array(100).fill({ dt: 1000/58, steps: 1}),
	...Array(100).fill({ dt: 1000/62, steps: 1})
])

test('can disable stabilization', physicsStepTest, { stabilizationFactor: 0 }, [
	...Array(14).fill({ dt: 1000/58, steps: 1}),
	{ dt: 1000/58, steps: 2 },

	{ dt: 1000/62, steps: 0 },
	...Array(30).fill({ dt: 1000/62, steps: 1}),
	{ dt: 1000/62, steps: 0 },
])
