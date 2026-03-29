import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene( options = {} ) {

	const {
		background = 0x0a0e1a,
		fog = true,
		fogDensity = 0.015,
		fov = 50,
		near = 0.1,
		far = 1000,
		cameraPosition = [ 5, 3, 8 ],
		antialias = true,
		shadows = true,
		toneMapping = true,
		orbit = true,
		orbitTarget = [ 0, 0, 0 ],
		autoRotate = false,
		container = document.getElementById( 'container' ) || document.body
	} = options;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color( background );

	if ( fog ) {

		scene.fog = new THREE.FogExp2( background, fogDensity );

	}

	const renderer = new THREE.WebGLRenderer( { antialias } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	if ( shadows ) {

		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;

	}

	if ( toneMapping ) {

		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;

	}

	const camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, near, far );
	camera.position.set( ...cameraPosition );

	let controls = null;

	if ( orbit ) {

		controls = new OrbitControls( camera, renderer.domElement );
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set( ...orbitTarget );
		controls.update();

		if ( autoRotate ) {

			controls.autoRotate = true;
			controls.autoRotateSpeed = 1.0;

		}

	}

	window.addEventListener( 'resize', () => {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );

	} );

	return { scene, renderer, camera, controls };

}

export function addCinematicLighting( scene, options = {} ) {

	const {
		ambient = 0.3,
		key = true,
		fill = true,
		rim = true,
		keyColor = 0xffffff,
		fillColor = 0x4488ff,
		rimColor = 0xff8844,
		keyIntensity = 2,
		fillIntensity = 0.8,
		rimIntensity = 1.2,
		shadows = true
	} = options;

	const ambientLight = new THREE.AmbientLight( 0xffffff, ambient );
	scene.add( ambientLight );

	if ( key ) {

		const keyLight = new THREE.DirectionalLight( keyColor, keyIntensity );
		keyLight.position.set( 5, 8, 4 );

		if ( shadows ) {

			keyLight.castShadow = true;
			keyLight.shadow.mapSize.setScalar( 2048 );
			keyLight.shadow.camera.near = 0.5;
			keyLight.shadow.camera.far = 50;
			keyLight.shadow.camera.left = - 10;
			keyLight.shadow.camera.right = 10;
			keyLight.shadow.camera.top = 10;
			keyLight.shadow.camera.bottom = - 10;
			keyLight.shadow.bias = - 0.001;

		}

		scene.add( keyLight );

	}

	if ( fill ) {

		const fillLight = new THREE.DirectionalLight( fillColor, fillIntensity );
		fillLight.position.set( - 4, 3, - 2 );
		scene.add( fillLight );

	}

	if ( rim ) {

		const rimLight = new THREE.DirectionalLight( rimColor, rimIntensity );
		rimLight.position.set( - 2, 5, - 6 );
		scene.add( rimLight );

	}

}

export function addGroundPlane( scene, options = {} ) {

	const {
		size = 30,
		color = 0x111522,
		roughness = 0.1,
		metalness = 0.8,
		receiveShadow = true,
		y = - 1
	} = options;

	const geometry = new THREE.PlaneGeometry( size, size );
	const material = new THREE.MeshStandardMaterial( {
		color,
		roughness,
		metalness
	} );
	const ground = new THREE.Mesh( geometry, material );
	ground.rotation.x = - Math.PI / 2;
	ground.position.y = y;
	ground.receiveShadow = receiveShadow;
	scene.add( ground );

	return ground;

}

/**
 * Set up a split-screen renderer with scissor test.
 * Returns a render function that takes (sceneA, cameraA, sceneB, cameraB) or
 * can render the same scene with two cameras.
 */
export function createSplitRenderer( renderer ) {

	renderer.setScissorTest( true );

	return function renderSplit( sceneOrA, cameraA, sceneOrB, cameraB ) {

		const w = window.innerWidth;
		const h = window.innerHeight;
		const halfW = Math.floor( w / 2 );

		const sceneA = sceneOrA;
		const sceneB = sceneOrB || sceneOrA;

		renderer.setViewport( 0, 0, halfW, h );
		renderer.setScissor( 0, 0, halfW, h );
		renderer.render( sceneA, cameraA );

		renderer.setViewport( halfW, 0, w - halfW, h );
		renderer.setScissor( halfW, 0, w - halfW, h );
		renderer.render( sceneB, cameraB );

	};

}

/**
 * Set up a multi-panel renderer (2x2, 3x1, 4x1, 5x1).
 * Returns a render function that takes an array of {scene, camera} pairs.
 */
export function createMultiPanelRenderer( renderer, layout = '2x2' ) {

	renderer.setScissorTest( true );

	return function renderPanels( panels ) {

		const w = window.innerWidth;
		const h = window.innerHeight;

		let cols, rows;

		if ( layout === '2x2' ) { cols = 2; rows = 2; }
		else if ( layout === '3x1' ) { cols = 3; rows = 1; }
		else if ( layout === '4x1' ) { cols = 4; rows = 1; }
		else if ( layout === '5x1' ) { cols = 5; rows = 1; }
		else if ( layout === '1x2' ) { cols = 1; rows = 2; }
		else { cols = 2; rows = 1; }

		const cellW = Math.floor( w / cols );
		const cellH = Math.floor( h / rows );

		for ( let i = 0; i < panels.length && i < cols * rows; i ++ ) {

			const col = i % cols;
			const row = rows - 1 - Math.floor( i / cols );
			const x = col * cellW;
			const y = row * cellH;

			const panel = panels[ i ];
			const cam = panel.camera;

			if ( cam.isPerspectiveCamera ) {

				cam.aspect = cellW / cellH;
				cam.updateProjectionMatrix();

			}

			renderer.setViewport( x, y, cellW, cellH );
			renderer.setScissor( x, y, cellW, cellH );
			renderer.render( panel.scene, cam );

		}

	};

}
