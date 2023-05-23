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
const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFF, 0.5)
const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.5)
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
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
dirLight.position.set(0, 1, 0)
dirLight.castShadow = true
scene.add(dirLight)
scene.add(hemisphereLight)

var audio
var audioContext
var bgmGain
var seGain
var character
var object
var mixer
var lastAction
var bgmBuffer
var bgmSource
var animations = []
var ses = []
var fps = 0
var frames = 0
var clockDelta = 0
var gameStarted = false
var userInteracted = false
var lastFrameTime = performance.now()
var chosenClass = Object.keys(classes)[1]

function loadModels() {
	textureLoader.load('./textures/grass.webp', texture => {
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
		progress['ground'] = xhr.loaded / (xhr.total || 1) * 99 / 2
	}, error => {
		console.error(error)
	})
	gltfLoader.load('./models/character.glb',
		gltf => {
			character = gltf.scene
			animations = gltf.animations
			character.traverse(el => {
				if (el.isMesh) el.castShadow = true
				if (el.name == 'Object_11') object = el
				if (el.name == 'Plane') el.visible = false
			})
			character.colorSpace = THREE.SRGBColorSpace
			character.position.y -= 0.5
			mixer = new THREE.AnimationMixer(character)
			lastAction = mixer.clipAction(animations.find(el => el.name == classes[Object.keys(classes)[1]].idle))
			lastAction.play()
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
			camera.position.z += size * 0.65
			camera.lookAt(center)
			scene.add(character)
			progress['character'] = 100
			initGame()
		}, xhr => {
			progress['character'] = xhr.loaded / (xhr.total || 1) * 99
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
	mixer.update(clockDelta)
	renderer.render(scene, camera)
	controls.update()
	updateFPSCounter()
	clockDelta = fpsLimit ? clockDelta % fpsLimit : clockDelta
}

function executeCrossFade(newAction, loop='repeat') {
	if (lastAction == newAction) return newAction.reset()
	newAction.enabled = true
	newAction.setEffectiveTimeScale(1)
	newAction.setEffectiveWeight(1)
	newAction.loop = loop == 'pingpong' ? THREE.LoopPingPong : loop == 'once' ? THREE.LoopOnce : THREE.LoopRepeat
	newAction.clampWhenFinished = loop == 'once'
	if (loop == 'once') newAction.reset()
	lastAction.crossFadeTo(newAction, 0.25, true)
	lastAction = newAction
	newAction.play()
}

function synchronizeCrossFade(newAction, loop='repeat') {
	mixer.addEventListener('finished', onLoopFinished)
	function onLoopFinished() {
		mixer.removeEventListener('finished', onLoopFinished)
		executeCrossFade(newAction, loop)
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
		let clip
		animationName = classes[chosenClass].stow
		if (animationName) {
			animation = animations.find(el => el.name == animationName)
			clip = mixer.clipAction(animation)
			executeCrossFade(clip, 'once')
		}
		playSe()
		chosenClass = e.target.value
		animationName = classes[chosenClass].take
		if (animationName) {
			setTimeout(() => {
				animation = animations.find(el => el.name == animationName)
				clip = mixer.clipAction(animation)
				synchronizeCrossFade(clip, 'once')
			}, 100)
			setTimeout(() => {playSe()}, 400)
		} else if (chosenClass == 'mago') {
			setTimeout(() => {playSe()}, 400)
		}
		setTimeout(() => {
			animationName = classes[chosenClass].idle
			animation = animations.find(el => el.name == animationName)
			clip = mixer.clipAction(animation)
			if (lastAction.loop == THREE.LoopOnce) synchronizeCrossFade(clip)
			else executeCrossFade(clip)
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
	fetch('./audio/bgm/bgm.mp3')
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
	const seList = ['bow', 'great-sword', 'stick', 'sword']
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
document.onclick = () => {
	if (userInteracted) return
	initAudio()
	userInteracted = true
}
document.onvisibilitychange = () => {
	if (document.hidden) stopBGM()
	else playBGM()
}
document.body.appendChild(renderer.domElement)