import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const SPONZA_PATH = '../assets/models/sponza/Sponza.gltf';
const DRAGON_PATH = '../../examples/models/gltf/DragonAttenuation.glb';
const HDR_PATH = '../../examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr';
const WATER_NORMAL_PATH = '../../examples/textures/water/Water_1_M_Normal.jpg';

const gltfLoader = new GLTFLoader();
const rgbeLoader = new HDRLoader();
const textureLoader = new THREE.TextureLoader();

const modelCache = new Map();
const textureCache = new Map();

function loadModel( path ) {

	if ( modelCache.has( path ) ) return modelCache.get( path );

	const promise = new Promise( ( resolve ) => {

		gltfLoader.load(
			path,
			( gltf ) => resolve( gltf.scene ),
			undefined,
			() => resolve( null )
		);

	} );

	modelCache.set( path, promise );
	return promise;

}

function loadTexture( path, opts = {} ) {

	if ( textureCache.has( path ) ) return textureCache.get( path );

	const texture = textureLoader.load( path );
	texture.wrapS = opts.wrapS || THREE.ClampToEdgeWrapping;
	texture.wrapT = opts.wrapT || THREE.ClampToEdgeWrapping;

	if ( opts.repeat ) texture.repeat.set( opts.repeat[ 0 ], opts.repeat[ 1 ] );
	texture.colorSpace = opts.colorSpace || THREE.SRGBColorSpace;

	textureCache.set( path, texture );
	return texture;

}

function loadEnvironment( renderer, scene ) {

	const pmremGenerator = new THREE.PMREMGenerator( renderer );
	pmremGenerator.compileEquirectangularShader();

	return new Promise( ( resolve ) => {

		rgbeLoader.load( HDR_PATH, ( texture ) => {

			const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
			scene.environment = envMap;
			texture.dispose();
			pmremGenerator.dispose();
			resolve( envMap );

		} );

	} );

}

function createCanvasTexture( key, painter, opts = {} ) {

	if ( textureCache.has( key ) ) return textureCache.get( key );

	const canvas = document.createElement( 'canvas' );
	canvas.width = opts.size || 1024;
	canvas.height = opts.size || 1024;

	const ctx = canvas.getContext( '2d' );
	painter( ctx, canvas.width, canvas.height );

	const texture = new THREE.CanvasTexture( canvas );
	texture.wrapS = opts.wrapS || THREE.ClampToEdgeWrapping;
	texture.wrapT = opts.wrapT || THREE.ClampToEdgeWrapping;
	texture.colorSpace = opts.colorSpace || THREE.SRGBColorSpace;

	textureCache.set( key, texture );
	return texture;

}

function createBeamTexture() {

	return createCanvasTexture(
		'ethereal-atrium-beam',
		( ctx, width, height ) => {

			ctx.clearRect( 0, 0, width, height );

			const body = ctx.createLinearGradient( width * 0.5, 0, width * 0.5, height );
			body.addColorStop( 0, 'rgba(255, 241, 212, 0.0)' );
			body.addColorStop( 0.15, 'rgba(255, 241, 212, 0.4)' );
			body.addColorStop( 0.5, 'rgba(255, 247, 232, 0.95)' );
			body.addColorStop( 0.85, 'rgba(255, 229, 185, 0.35)' );
			body.addColorStop( 1, 'rgba(255, 229, 185, 0.0)' );
			ctx.fillStyle = body;
			ctx.fillRect( 0, 0, width, height );

			ctx.globalCompositeOperation = 'destination-in';
			const widthMask = ctx.createRadialGradient(
				width * 0.5,
				height * 0.5,
				width * 0.04,
				width * 0.5,
				height * 0.5,
				width * 0.5
			);
			widthMask.addColorStop( 0, 'rgba(255,255,255,1)' );
			widthMask.addColorStop( 0.55, 'rgba(255,255,255,0.45)' );
			widthMask.addColorStop( 1, 'rgba(255,255,255,0)' );
			ctx.fillStyle = widthMask;
			ctx.fillRect( 0, 0, width, height );

		}
	);

}

function createGlowTexture( key, innerColor, outerColor ) {

	return createCanvasTexture(
		key,
		( ctx, width, height ) => {

			ctx.clearRect( 0, 0, width, height );

			const gradient = ctx.createRadialGradient(
				width * 0.5,
				height * 0.5,
				width * 0.03,
				width * 0.5,
				height * 0.5,
				width * 0.5
			);
			gradient.addColorStop( 0, innerColor );
			gradient.addColorStop( 0.2, innerColor );
			gradient.addColorStop( 1, outerColor );

			ctx.fillStyle = gradient;
			ctx.fillRect( 0, 0, width, height );

		}
	);

}

function createCrossBeam( texture, color, opacity, width, height ) {

	const material = new THREE.MeshBasicMaterial( {
		map: texture,
		color: color,
		transparent: true,
		opacity: opacity,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		side: THREE.DoubleSide
	} );

	const group = new THREE.Group();

	for ( const rotation of [ 0, Math.PI / 2 ] ) {

		const plane = new THREE.Mesh( new THREE.PlaneGeometry( width, height ), material.clone() );
		plane.rotation.y = rotation;
		group.add( plane );

	}

	return group;

}

function createSkyDome() {

	return new THREE.Mesh(
		new THREE.SphereGeometry( 220, 48, 28 ),
		new THREE.ShaderMaterial( {
			side: THREE.BackSide,
			depthWrite: false,
			uniforms: {
				topColor: { value: new THREE.Color( 0x10264f ) },
				midColor: { value: new THREE.Color( 0x35598f ) },
				horizonColor: { value: new THREE.Color( 0xf6b879 ) }
			},
			vertexShader: `
				varying vec3 vWorldPosition;

				void main() {

					vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
					vWorldPosition = worldPosition.xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`,
			fragmentShader: `
				uniform vec3 topColor;
				uniform vec3 midColor;
				uniform vec3 horizonColor;
				varying vec3 vWorldPosition;

				void main() {

					float h = normalize( vWorldPosition ).y * 0.5 + 0.5;
					vec3 color = mix( horizonColor, midColor, smoothstep( 0.0, 0.42, h ) );
					color = mix( color, topColor, smoothstep( 0.55, 1.0, h ) );
					gl_FragColor = vec4( color, 1.0 );

				}
			`
		} )
	);

}

function createDustField( count ) {

	const texture = createGlowTexture(
		'ethereal-atrium-dust',
		'rgba(255,255,255,1)',
		'rgba(255,255,255,0)'
	);

	const geometry = new THREE.BufferGeometry();
	const positions = new Float32Array( count * 3 );
	const sizes = new Float32Array( count );
	const base = [];

	for ( let i = 0; i < count; i ++ ) {

		const x = ( Math.random() - 0.5 ) * 48;
		const y = 1.4 + Math.random() * 22;
		const z = ( Math.random() - 0.5 ) * 40;

		base.push( {
			x: x,
			y: y,
			z: z,
			drift: 0.12 + Math.random() * 0.38,
			phase: Math.random() * Math.PI * 2,
			amp: 0.12 + Math.random() * 0.28
		} );

		positions[ i * 3 + 0 ] = x;
		positions[ i * 3 + 1 ] = y;
		positions[ i * 3 + 2 ] = z;
		sizes[ i ] = 0.55 + Math.random() * 1.35;

	}

	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );

	const material = new THREE.PointsMaterial( {
		map: texture,
		color: 0xffefd8,
		size: 0.085,
		transparent: true,
		opacity: 0.32,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		sizeAttenuation: true
	} );

	return {
		base: base,
		points: new THREE.Points( geometry, material ),
		positions: positions
	};

}

function normalizeSceneToFloor( object, heightTarget, centerXZ = true ) {

	const box = new THREE.Box3().setFromObject( object );
	const size = box.getSize( new THREE.Vector3() );
	const scale = heightTarget / size.y;

	object.scale.setScalar( scale );
	object.updateMatrixWorld( true );

	const scaledBox = new THREE.Box3().setFromObject( object );
	const scaledCenter = scaledBox.getCenter( new THREE.Vector3() );
	object.position.set( centerXZ ? - scaledCenter.x : 0, - scaledBox.min.y, centerXZ ? - scaledCenter.z : 0 );
	object.updateMatrixWorld( true );

}

function createMirrorPool() {

	const reflector = new Reflector(
		new THREE.PlaneGeometry( 18, 6.8 ),
		{
			textureWidth: 2048,
			textureHeight: 1024,
			color: 0x31261d,
			clipBias: 0.00035
		}
	);
	reflector.rotation.x = - Math.PI / 2;
	reflector.position.y = 0.06;
	reflector.material.transparent = true;
	reflector.material.opacity = 0.78;

	const ripple = new THREE.Mesh(
		new THREE.PlaneGeometry( 18, 6.8 ),
		new THREE.MeshPhysicalMaterial( {
			color: 0x203243,
			roughness: 0.08,
			transmission: 0.14,
			thickness: 0.45,
			metalness: 0.12,
			transparent: true,
			opacity: 0.09,
			ior: 1.33,
			clearcoat: 1,
			clearcoatRoughness: 0.12,
			normalMap: loadTexture( WATER_NORMAL_PATH, {
				wrapS: THREE.RepeatWrapping,
				wrapT: THREE.RepeatWrapping,
				repeat: [ 8, 3.4 ],
				colorSpace: THREE.NoColorSpace
			} ),
			normalScale: new THREE.Vector2( 0.16, 0.16 )
		} )
	);
	ripple.rotation.x = - Math.PI / 2;
	ripple.position.y = 0.072;

	const frameMaterial = new THREE.MeshPhysicalMaterial( {
		color: 0x171310,
		roughness: 0.16,
		metalness: 0.52,
		clearcoat: 1,
		clearcoatRoughness: 0.08
	} );

	const frame = new THREE.Group();
	const dims = [
		[ 18.9, 0.3, 0.3, 0, 0.17, 3.55 ],
		[ 18.9, 0.3, 0.3, 0, 0.17, - 3.55 ],
		[ 0.3, 0.3, 7.4, 9.3, 0.17, 0 ],
		[ 0.3, 0.3, 7.4, - 9.3, 0.17, 0 ]
	];

	for ( const dim of dims ) {

		const edge = new THREE.Mesh( new THREE.BoxGeometry( dim[ 0 ], dim[ 1 ], dim[ 2 ] ), frameMaterial );
		edge.position.set( dim[ 3 ], dim[ 4 ], dim[ 5 ] );
		edge.castShadow = true;
		edge.receiveShadow = true;
		frame.add( edge );

	}

	return { reflector, ripple, frame };

}

function configureMaterial( material ) {

	if ( ! material || material.userData.etherealConfigured ) return;

	material.userData.etherealConfigured = true;
	material.envMapIntensity = Math.max( material.envMapIntensity || 1, 1.3 );

	if ( material.roughness !== undefined ) {

		material.roughness = THREE.MathUtils.clamp( material.roughness * 0.96, 0.04, 1 );

	}

	if ( material.metalness !== undefined ) {

		material.metalness = THREE.MathUtils.clamp( material.metalness, 0, 0.9 );

	}

}

export function buildEtherealAtriumScene( scene, renderer ) {

	const state = {
		dragon: null,
		lanterns: [],
		beams: [],
		waterRipple: null,
		dust: null,
		update() {}
	};

	scene.fog = new THREE.FogExp2( 0x0d1523, 0.018 );
	scene.background = new THREE.Color( 0x10254a );
	scene.add( createSkyDome() );
	renderer.localClippingEnabled = true;

	loadEnvironment( renderer, scene );

	const hemi = new THREE.HemisphereLight( 0xbfd7ff, 0x26160d, 0.95 );
	scene.add( hemi );

	const sunTarget = new THREE.Object3D();
	sunTarget.position.set( 1, 6, 0 );
	scene.add( sunTarget );

	const sun = new THREE.DirectionalLight( 0xffd6a7, 4.8 );
	sun.position.set( 20, 24, 6 );
	sun.target = sunTarget;
	sun.castShadow = true;
	sun.shadow.mapSize.set( 4096, 4096 );
	sun.shadow.bias = - 0.00022;
	sun.shadow.normalBias = 0.016;
	sun.shadow.camera.left = - 22;
	sun.shadow.camera.right = 22;
	sun.shadow.camera.top = 18;
	sun.shadow.camera.bottom = - 18;
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 70;
	scene.add( sun );

	const coolFill = new THREE.DirectionalLight( 0x8abbff, 0.8 );
	coolFill.position.set( - 16, 18, - 10 );
	scene.add( coolFill );

	const backGlow = new THREE.PointLight( 0x9cd3ff, 3.2, 24, 2 );
	backGlow.position.set( - 6, 7.4, - 10 );
	scene.add( backGlow );

	const heroSpot = new THREE.SpotLight( 0xffe1bf, 3.6, 32, Math.PI * 0.23, 0.6, 1.5 );
	heroSpot.position.set( 3.5, 13, 1.8 );
	heroSpot.target.position.set( 0, 1.2, 0 );
	scene.add( heroSpot );
	scene.add( heroSpot.target );

	const pool = createMirrorPool();
	scene.add( pool.reflector );
	scene.add( pool.ripple );
	scene.add( pool.frame );
	state.waterRipple = pool.ripple;

	const plinth = new THREE.Mesh(
		new THREE.CylinderGeometry( 1.95, 2.2, 0.74, 48 ),
		new THREE.MeshPhysicalMaterial( {
			color: 0x17120f,
			roughness: 0.14,
			metalness: 0.42,
			clearcoat: 1,
			clearcoatRoughness: 0.08
		} )
	);
	plinth.position.set( 0, 0.42, 0 );
	plinth.castShadow = true;
	plinth.receiveShadow = true;
	scene.add( plinth );

	const plinthHalo = new THREE.Mesh(
		new THREE.TorusGeometry( 2.32, 0.06, 16, 100 ),
		new THREE.MeshBasicMaterial( { color: 0xffc56a } )
	);
	plinthHalo.rotation.x = Math.PI / 2;
	plinthHalo.position.set( 0, 0.78, 0 );
	scene.add( plinthHalo );

	const glowDisc = new THREE.Mesh(
		new THREE.PlaneGeometry( 6.4, 6.4 ),
		new THREE.MeshBasicMaterial( {
			map: createGlowTexture( 'ethereal-atrium-floor-glow', 'rgba(255,214,152,1)', 'rgba(255,214,152,0)' ),
			color: 0xffd089,
			transparent: true,
			opacity: 0.12,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		} )
	);
	glowDisc.rotation.x = - Math.PI / 2;
	glowDisc.position.y = 0.085;
	scene.add( glowDisc );

	const spriteTexture = createGlowTexture(
		'ethereal-atrium-lantern',
		'rgba(255,248,236,1)',
		'rgba(255,220,140,0)'
	);

	const lanternPositions = [
		[ - 8, 2.2, - 5 ],
		[ - 8, 2.1, 5 ],
		[ 8, 2.2, - 5 ],
		[ 8, 2.1, 5 ],
		[ - 11, 4.8, - 1.5 ],
		[ 11, 4.8, 1.5 ],
		[ - 5, 6.1, - 10.5 ],
		[ 5, 6.1, 10.5 ]
	];

	for ( const [ x, y, z ] of lanternPositions ) {

		const lantern = new THREE.Sprite(
			new THREE.SpriteMaterial( {
				map: spriteTexture,
				color: 0xffd28c,
				transparent: true,
				opacity: 0.82,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			} )
		);
		lantern.position.set( x, y, z );
		lantern.scale.setScalar( 0.78 );
		lantern.userData.baseY = y;
		scene.add( lantern );
		state.lanterns.push( lantern );

		const light = new THREE.PointLight( 0xffc173, 1.55, 9, 2 );
		light.position.copy( lantern.position );
		light.userData.baseY = y;
		scene.add( light );
		state.lanterns.push( light );

	}

	const beamTexture = createBeamTexture();
	const roofClipPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), 11.4 );
	const sideClipPlane = new THREE.Plane( new THREE.Vector3( - 1, 0, 0 ), 8.4 );
	const beamDefs = [
		{ pos: [ 2.4, 9.8, - 1.6 ], rot: [ 0.05, 0.1, - 0.12 ], scale: [ 4.6, 12.4 ], opacity: 0.16, color: 0xffdfb9 },
		{ pos: [ 5.6, 9.4, 2.4 ], rot: [ 0.02, - 0.18, 0.08 ], scale: [ 4.2, 11.2 ], opacity: 0.12, color: 0xffd4a4 }
	];

	for ( const def of beamDefs ) {

		const beam = createCrossBeam( beamTexture, def.color, def.opacity, def.scale[ 0 ], def.scale[ 1 ] );
		beam.position.set( def.pos[ 0 ], def.pos[ 1 ], def.pos[ 2 ] );
		beam.rotation.set( def.rot[ 0 ], def.rot[ 1 ], def.rot[ 2 ] );
		scene.add( beam );
		state.beams.push( beam );

	}

	const dust = createDustField( 240 );
	scene.add( dust.points );
	state.dust = dust;

	const accentRing = new THREE.Mesh(
		new THREE.TorusGeometry( 4.15, 0.08, 12, 100 ),
		new THREE.MeshBasicMaterial( {
			color: 0x8fd7ff,
			transparent: true,
			opacity: 0.55
		} )
	);
	accentRing.rotation.x = Math.PI / 2;
	accentRing.position.y = 0.09;
	scene.add( accentRing );

	loadModel( SPONZA_PATH ).then( ( sponzaScene ) => {

		if ( ! sponzaScene ) return;

		const atrium = sponzaScene.clone( true );
		normalizeSceneToFloor( atrium, 20, false );
		atrium.updateMatrixWorld( true );

		atrium.traverse( ( child ) => {

			if ( ! child.isMesh ) return;

			child.castShadow = true;
			child.receiveShadow = true;

			if ( Array.isArray( child.material ) ) {

				child.material.forEach( ( material ) => {

					configureMaterial( material );
					material.clippingPlanes = [ roofClipPlane, sideClipPlane ];

				} );

			} else {

				configureMaterial( child.material );
				child.material.clippingPlanes = [ roofClipPlane, sideClipPlane ];

			}

		} );

		scene.add( atrium );

	} );

	loadModel( DRAGON_PATH ).then( ( dragonScene ) => {

		if ( ! dragonScene ) return;

		const sculpture = new THREE.Group();

		dragonScene.traverse( ( child ) => {

			if ( ! child.isMesh || ! child.material || ! child.material.isMeshPhysicalMaterial ) return;

			const mesh = new THREE.Mesh( child.geometry.clone(), child.material.clone() );
			child.updateWorldMatrix( true, false );
			child.matrixWorld.decompose( mesh.position, mesh.quaternion, mesh.scale );
			sculpture.add( mesh );

		} );

		normalizeSceneToFloor( sculpture, 3.7 );

		sculpture.position.set( sculpture.position.x, sculpture.position.y + 0.7, sculpture.position.z + 0.12 );
		sculpture.rotation.y = Math.PI * 0.16;

		sculpture.traverse( ( child ) => {

			if ( ! child.isMesh ) return;

			child.castShadow = true;
			child.receiveShadow = true;

			if ( child.material && child.material.isMeshPhysicalMaterial ) {

				const material = child.material.clone();
				material.color.set( 0xfff0c8 );
				material.transmission = 1;
				material.opacity = 1;
				material.transparent = false;
				material.roughness = 0.03;
				material.metalness = 0;
				material.ior = 1.28;
				material.thickness = 2.7;
				material.attenuationColor.set( 0xffc670 );
				material.attenuationDistance = 0.82;
				material.envMapIntensity = 2.6;
				material.specularIntensity = 1;
				material.specularColor.set( 0xfff8ea );
				child.material = material;

			}

		} );

		scene.add( sculpture );
		state.dragon = sculpture;

	} );

	state.update = ( time ) => {

		if ( state.dragon ) {

			state.dragon.rotation.y = Math.PI * 0.16 + time * 0.08;
			state.dragon.position.y = 0.7 + Math.sin( time * 0.8 ) * 0.08;

		}

		pool.ripple.material.normalMap.offset.x = time * 0.012;
		pool.ripple.material.normalMap.offset.y = time * 0.007;

		for ( let i = 0; i < state.beams.length; i ++ ) {

			const beam = state.beams[ i ];
			beam.children.forEach( ( plane ) => {

				plane.material.opacity = 0.1 + Math.sin( time * 0.45 + i ) * 0.025 + ( 0.08 - i * 0.015 );

			} );

		}

		for ( let i = 0; i < state.lanterns.length; i += 2 ) {

			const lantern = state.lanterns[ i ];
			const light = state.lanterns[ i + 1 ];
			const pulse = 0.78 + Math.sin( time * 1.1 + i ) * 0.12;

			lantern.material.opacity = pulse;
			lantern.position.y = lantern.userData.baseY + Math.sin( time * 0.8 + i ) * 0.08;
			light.position.y = light.userData.baseY + Math.sin( time * 0.8 + i ) * 0.08;
			light.intensity = 1.45 + Math.sin( time * 1.1 + i ) * 0.22;

		}

		const positions = state.dust.positions;
		for ( let i = 0; i < state.dust.base.length; i ++ ) {

			const mote = state.dust.base[ i ];
			positions[ i * 3 + 0 ] = mote.x + Math.sin( time * mote.drift + mote.phase ) * mote.amp;
			positions[ i * 3 + 1 ] = mote.y + Math.sin( time * mote.drift * 0.7 + mote.phase ) * mote.amp * 0.7;
			positions[ i * 3 + 2 ] = mote.z + Math.cos( time * mote.drift * 0.8 + mote.phase ) * mote.amp;

		}

		state.dust.points.geometry.attributes.position.needsUpdate = true;

	};

	return state;

}
