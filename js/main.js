import * as THREE from './three.module.js'
import { GLTFLoader } from './gltfLoader.module.js'
import { OrbitControls } from './orbitControls.js'
import classes from './classes.js'

if (location.protocol.startsWith('https')) {
	navigator.serviceWorker.register('service-worker.js')
	navigator.serviceWorker.onmessage = m => {
		console.info('Update found!')
		if (m?.data == 'update') location.reload(true)
	}
}

const clock = new THREE.Clock()
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true})
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.5)
const dirLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.5)
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
const raycaster = new THREE.Raycaster()
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement)
const fpsLimit = 1 / 60

const progress = new Proxy({}, {
	set: function(target, key, value) {
		target[key] = value
		let values = Object.values(target).slice()
		let progressbar = document.querySelector('progress')
		let total = values.reduce((a, b) => a + b, 0)
		total = total / 2
		if (progressbar) progressbar.value = parseInt(total || 0)
		if (total >= 100) setTimeout(() => initGame(), 1000)
		return true
	}
})

scene.background = null
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
controls.enableRotate = true
controls.enableZoom = false
controls.maxPolarAngle = (Math.PI / 2) - 0.1
dirLight.position.set(0, 1, 1)
dirLight.castShadow = true
dirLight2.position.set(0, 1, 1)
dirLight2.castShadow = true
scene.add(dirLight)
scene.add(dirLight2)

var audio
var audioContext
var bgmGain
var seGain
var character
var monster
var object
var bgmBuffer
var bgmSource
var ses = []
var fps = 0
var frames = 0
var clockDelta = 0
var gameStarted = false
var lastFrameTime = performance.now()
var chosenClass = Object.keys(classes)[1]

function loadModels() {
	/* textureLoader.load('./textures/grass.webp', texture => {
		texture.wrapS = THREE.MirroredRepeatWrapping
		texture.wrapT = THREE.MirroredRepeatWrapping
		texture.colorSpace = THREE.SRGBColorSpace
		texture.repeat.set(5, 5)
		const material = new THREE.MeshPhongMaterial({map: texture})
		const ground = new THREE.Mesh(new THREE.CircleGeometry(10), material)
		ground.rotation.x = - Math.PI / 2
		ground.position.y -= 0.5
		ground.receiveShadow = true
		scene.add(ground)
		if (!progress['ground']) progress['ground'] = 100
	}, xhr => {
		if (xhr.total) progress['ground'] = xhr.loaded / xhr.total * 99
	}, error => {
		console.error(error)
	}) */
	const material = new THREE.MeshPhongMaterial({color: 0x242424})
	const ground = new THREE.Mesh(new THREE.CircleGeometry(10), material)
	ground.rotation.x = - Math.PI / 2
	ground.position.y -= 0.5
	ground.receiveShadow = true
	scene.add(ground)
	gltfLoader.load('./models/character.glb',
		gltf => {
			character = gltf.scene
			character.name = 'character'
			character.traverse(el => {
				if (el.isMesh) el.castShadow = true
				if (el.name == 'Object_11') object = el
				if (el.name == 'Plane') el.visible = false
			})
			character.colorSpace = THREE.SRGBColorSpace
			character.position.y -= 0.5
			character.mixer = new THREE.AnimationMixer(character)
			character.animations = gltf.animations.reduce((p, c) => {
				p[c.name] = character.mixer.clipAction(c)
				return p
			}, {})
			character.lastAction = character.animations[classes[Object.keys(classes)[1]].idle]
			character.lastAction.play()
			const box = new THREE.Box3().setFromObject(character)
			const size = box.getSize(new THREE.Vector3()).length()
			const center = box.getCenter(new THREE.Vector3())
			object.position.x += (object.position.x - center.x)
			object.position.y += (object.position.y - center.y)
			object.position.z += (object.position.z - center.z)
			dirLight.target = character
			camera.near = size / 100
			camera.far = size * 100
			center.y += 0.5
			camera.position.z += size * 0.75
			camera.lookAt(center)
			character.position.x += 2.75
			character.rotation.y = Math.PI / 2 * -1
			/* textureLoader.load('./textures/black.png', texture => {
				texture.colorSpace = THREE.SRGBColorSpace
				texture.flipY = false
				character.traverse(el => {
					if (el.name == 'Object_11') el.material.map = texture
				})
			}) */
			character.hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2, 0.25), new THREE.MeshBasicMaterial({visible: false, color: 0x00ff00}))
			character.add(character.hitbox)
			character.hitbox.geometry.computeBoundingBox()
			character.originalX = character.position.x
			character.originalDir = character.rotation.y
			character.attackDelay = 0.35
			scene.add(character)
			progress['character'] = 100
			initGame()
		}, xhr => {
			if (xhr.total) progress['character'] = xhr.loaded / xhr.total * 99
		}, error => {
			console.error(error)
		}
	)
	gltfLoader.load('./models/skeleton.glb',
		gltf => {
			monster = gltf.scene
			monster.name = 'monster'
			monster.traverse(el => {
				if (el.isMesh) el.castShadow = true
			})
			monster.colorSpace = THREE.SRGBColorSpace
			monster.position.y -= 0.5
			monster.position.x -= 3
			monster.rotation.y = Math.PI / 2
			monster.scale.set(0.35, 0.35, 0.35)
			monster.hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.25, 0.75), new THREE.MeshBasicMaterial({visible: false, color: 0x00ff00}))
			monster.add(monster.hitbox)
			monster.hitbox.geometry.computeBoundingBox()
			monster.mixer = new THREE.AnimationMixer(monster)
			monster.animations = gltf.animations.reduce((p, c) => {
				p[c.name] = monster.mixer.clipAction(c)
				return p
			}, {})
			monster.lastAction = monster.animations['idle']
			monster.lastAction.play()
			dirLight2.target = monster
			monster.originalX = monster.position.x
			monster.originalDir = monster.rotation.y
			monster.attackDelay = 0.375
			scene.add(monster)
			progress['monster'] = 100
		}, xhr => {
			if (xhr.total) progress['monster'] = xhr.loaded / xhr.total * 99
		}, error => {
			console.error(error)
		}
	)
}

function initGame() {
	if (gameStarted) return
	gameStarted = true
	document.body.classList.add('loaded')
	document.body.removeChild(document.querySelector('figure'))
	document.querySelector('main').style.removeProperty('display')
	document.querySelector('#fps').style.removeProperty('display')
	document.querySelector('main button').onclick = () => attack()
	resizeScene()
	animate()
}

function resizeScene() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
	requestAnimationFrame(animate)
	if (document.hidden) return
	clockDelta += clock.getDelta()
	if (fpsLimit && clockDelta < fpsLimit) return
	character.mixer.update(clockDelta)
	monster.mixer.update(clockDelta)
	renderer.render(scene, camera)
	controls.update()
	updateFPSCounter()
	updateMovement(character)
	updateMovement(monster)
	clockDelta = fpsLimit ? clockDelta % fpsLimit : clockDelta
}

function executeCrossFade(target, newAction, loop='repeat') {
	if (character.lastAction == newAction) return newAction.reset()
	newAction.enabled = true
	newAction.setEffectiveTimeScale(1)
	newAction.setEffectiveWeight(1)
	newAction.loop = loop == 'pingpong' ? THREE.LoopPingPong : loop == 'once' ? THREE.LoopOnce : THREE.LoopRepeat
	newAction.clampWhenFinished = loop == 'once'
	if (loop == 'once') newAction.reset()
	target.lastAction.crossFadeTo(newAction, 0.25, true)
	target.lastAction = newAction
	newAction.play()
}

function synchronizeCrossFade(target, newAction, loop='repeat', callback) {
	target.mixer.addEventListener('finished', onLoopFinished)
	function onLoopFinished() {
		target.mixer.removeEventListener('finished', onLoopFinished)
		executeCrossFade(target, newAction, loop)
		if (callback) callback()
	}
}

function updateFPSCounter() {
	frames++
	if (performance.now() < lastFrameTime + 1000) return
	fps = Math.round(( frames * 1000 ) / ( performance.now() - lastFrameTime ))
	if (!Number.isNaN(fps)) {
		let ctx = document.querySelector('#fps').getContext('2d')
		ctx.font = 'bold 20px sans-serif'
		ctx.textAlign = 'end'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = 'rgba(255,255,255,0.25)'
		ctx.clearRect(0, 0, 80, 20)
		ctx.fillText(`${fps} FPS`, 80, 10)
	}
	lastFrameTime = performance.now()
	frames = 0
}

function attack() {
	const animation = character.animations[classes[chosenClass].run ?? classes[general].run]
	executeCrossFade(character, animation)
	character.isWalking = true
	/* const animation = monster.animations['run']
	executeCrossFade(monster, animation)
	monster.isWalking = true */
}

function updateMovement(target) {
	if (!target.isWalking) return
	let animation
	const opponent = target.name == 'character' ? monster : character
	const reached = Math.max(target.position.x, opponent.position.x) - Math.min(target.position.x, opponent.position.x)
	if (target.isReturning) {
		if (target.position.x == target.originalX) {
			animation = target.name == 'character' ? target.animations[classes[chosenClass].idle ?? classes['general'].idle] : target.animations['idle']
			executeCrossFade(target, animation)
			target.rotation.y = target.originalDir
			target.isWalking = false
			target.isReturning = false
			target.isAttacking = false
		} else {
			if (target.rotation.y == target.originalDir) target.rotation.y = target.originalDir * -1
			target.position.x > target.originalX ? target.position.x -= 0.1 : target.position.x += 0.1
		}
	} else if (reached <= 0.8) {
		if (!target.isAttacking) {
			let delay
			animation = target.name == 'character' ? target.animations[classes[chosenClass].attack1 ?? classes['general'].attack1] : target.animations['attack1']
			executeCrossFade(target, animation, 'once')
			delay = animation.getClip().duration * 1000
			setTimeout(() => {
				playSE(ses['sword'])
				setTimeout(() => {
					target.name == 'character' ? playSE(ses['zombieYell']) : playSE(ses['humanYell'])
					animation = opponent.name == 'character' ? opponent.animations[classes[chosenClass].hit ?? classes['general'].hit] : opponent.animations['hit']
					executeCrossFade(opponent, animation, 'once')
					animation = opponent.name == 'character' ? opponent.animations[classes[chosenClass].idle ?? classes['general'].idle] : opponent.animations['idle']
					synchronizeCrossFade(opponent, animation)
				}, ses['sword'] * 500)
			}, delay * target.attackDelay)
			animation = target.name == 'character' ? character.animations[classes[chosenClass].run ?? classes[general].run] : target.animations['run']
			synchronizeCrossFade(target, animation, 'repeat', () => {
				target.isReturning = true
			})
			target.isAttacking = true
		}
	} else {
		target.position.x > opponent.position.x ? target.position.x -= 0.1 : target.position.x += 0.1
	}
}

function classSelection() {
	Object.keys(classes).forEach(el => {
		if (el == 'general') return
		const option = document.createElement('option')
		option.value = el
		option.innerHTML = el.substring(0,1).toUpperCase() + el.slice(1)
		document.querySelector('select').appendChild(option)
	})
	document.querySelector('select').oninput = e => {
		let animationName
		let animation
		animationName = classes[chosenClass].stow
		if (animationName) {
			animation = character.animations[animationName]
			executeCrossFade(character, animation, 'once')
		}
		playSe()
		chosenClass = e.target.value
		animationName = classes[chosenClass].take
		if (animationName) {
			setTimeout(() => {
				animation = character.animations[animationName]
				synchronizeCrossFade(character, animation, 'once')
			}, 100)
			setTimeout(() => {playSe()}, 400)
		} else if (chosenClass == 'mago') {
			setTimeout(() => {playSe()}, 400)
		}
		setTimeout(() => {
			animationName = classes[chosenClass].idle
			animation = character.animations[animationName]
			if (character.lastAction.loop == THREE.LoopOnce) synchronizeCrossFade(character, animation)
			else executeCrossFade(character, animation)
		}, 200)
	}
	function playSe() {
		let se = null
		if (chosenClass == 'guerreiro') se = 'sword'
		else if (chosenClass == 'paladino') se = 'great-sword'
		else if (chosenClass == 'mago') se = 'stick'
		else if (chosenClass == 'arqueiro') se = 'bow'
		if (se) playSE(ses[se])
	}
}

function initAudio() {
	audio = new Audio()
	audioContext = new AudioContext()
	bgmGain = audioContext.createGain()
	bgmGain.gain.value = 0.25
	seGain = audioContext.createGain()
	seGain.gain.value = 1
	const destination = audioContext.createMediaStreamDestination()
	bgmGain.connect(audioContext.destination)
	seGain.connect(audioContext.destination)
	audio.srcObject = destination.stream
	audio.play()
	fetch('./audio/bgm/battle.mp3')
	.then(response => {
		response.arrayBuffer()
		.then(buffer => {
			audioContext.decodeAudioData(buffer)
			.then(audioData => {
				bgmBuffer = audioData
				playBGM()
			})
		})
	})
	const seList = ['bow', 'great-sword', 'stick', 'sword', 'humanYell', 'zombieYell']
	seList.forEach(el => {
		fetch(`./audio/se/${el}.mp3`)
		.then(response => {
			response.arrayBuffer()
			.then(buffer => {
				audioContext.decodeAudioData(buffer)
				.then(audioData => {
					ses[el] = audioData
				})
			})
		})
	})
}

function playBGM(restart=true) {
	if (!audioContext || !bgmBuffer) return
	bgmSource = audioContext.createBufferSource()
	bgmSource.buffer = bgmBuffer
	bgmSource.loop = true
	bgmSource.connect(bgmGain)
	if (localStorage.getItem('bgm') !== 'false') {
		restart ? bgmSource.start(0) : bgmSource.start()
	}
	bgmSource.onended = () => {
		bgmSource.disconnect()
		bgmSource = undefined
	}
}

function stopBGM() {
	try {if (bgmSource) bgmSource.stop()} catch(e){}
}

function playSE(buffer, loop=false) {
	if (!audioContext || !buffer) return
	const src = audioContext.createBufferSource()
	src.buffer = buffer
	src.loop = loop
	src.connect(seGain)
	src.start(0)
	src.onended = () => {
		src.disconnect()
	}
}

window.onresize = () => resizeScene()
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	loadModels()
	classSelection()
}
document.onvisibilitychange = () => {
	if (document.hidden) stopBGM()
	else playBGM()
}
document.body.appendChild(renderer.domElement)

document.addEventListener('click',  () => {
	initAudio()
}, {once: true})