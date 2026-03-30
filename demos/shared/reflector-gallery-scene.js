import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const MODELS = '../../examples/models/gltf/';
const HDR = '../../examples/textures/equirectangular/san_giuseppe_bridge_2k.hdr';

const gltfLoader = new GLTFLoader();
const rgbeLoader = new HDRLoader();
const textureCache = new Map();
const modelCache = new Map();

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

function loadEnvironment( renderer, scene ) {

	const pmremGenerator = new THREE.PMREMGenerator( renderer );
	pmremGenerator.compileEquirectangularShader();

	return new Promise( ( resolve ) => {

		rgbeLoader.load( HDR, ( texture ) => {

			const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
			scene.environment = envMap;
			texture.dispose();
			pmremGenerator.dispose();
			resolve( envMap );

		} );

	} );

}

function createCanvasTexture( key, painter, size = 1024 ) {

	if ( textureCache.has( key ) ) return textureCache.get( key );

	const canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext( '2d' );
	painter( ctx, size, size );

	const texture = new THREE.CanvasTexture( canvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	textureCache.set( key, texture );
	return texture;

}

function createGlowTexture( key, innerColor, outerColor ) {

	return createCanvasTexture( key, ( ctx, width, height ) => {

		const gradient = ctx.createRadialGradient(
			width * 0.5,
			height * 0.5,
			width * 0.02,
			width * 0.5,
			height * 0.5,
			width * 0.5
		);
		gradient.addColorStop( 0, innerColor );
		gradient.addColorStop( 0.24, innerColor );
		gradient.addColorStop( 1, outerColor );
		ctx.fillStyle = gradient;
		ctx.fillRect( 0, 0, width, height );

	} );

}

function normalizeToHeight( object, height ) {

	const bounds = new THREE.Box3().setFromObject( object );
	const size = bounds.getSize( new THREE.Vector3() );
	const scale = height / size.y;

	object.scale.setScalar( scale );
	object.updateMatrixWorld( true );

	const scaledBounds = new THREE.Box3().setFromObject( object );
	const scaledCenter = scaledBounds.getCenter( new THREE.Vector3() );
	object.position.set( - scaledCenter.x, - scaledBounds.min.y, - scaledCenter.z );
	object.updateMatrixWorld( true );

}

function createBackdrop() {

	const group = new THREE.Group();

	const shell = new THREE.Mesh(
		new THREE.CylinderGeometry( 22, 22, 16, 48, 1, true, Math.PI * 0.17, Math.PI * 1.66 ),
		new THREE.MeshStandardMaterial( {
			color: 0x09111e,
			roughness: 0.48,
			metalness: 0.1,
			side: THREE.BackSide
		} )
	);
	shell.position.set( 0, 7.8, - 4 );
	group.add( shell );

	const rearWall = new THREE.Mesh(
		new THREE.BoxGeometry( 28, 14, 0.6 ),
		new THREE.MeshStandardMaterial( {
			color: 0x0a1120,
			roughness: 0.42,
			metalness: 0.18
		} )
	);
	rearWall.position.set( 0, 7, - 10.5 );
	group.add( rearWall );

	return group;

}

function createPedestal( radius, height, color, emissive ) {

	const group = new THREE.Group();

	const base = new THREE.Mesh(
		new THREE.CylinderGeometry( radius * 1.06, radius * 1.14, height, 40 ),
		new THREE.MeshPhysicalMaterial( {
			color: color,
			roughness: 0.18,
			metalness: 0.58,
			clearcoat: 1,
			clearcoatRoughness: 0.08
		} )
	);
	base.castShadow = true;
	base.receiveShadow = true;
	base.position.y = height * 0.5;
	group.add( base );

	const trim = new THREE.Mesh(
		new THREE.TorusGeometry( radius * 0.98, 0.045, 16, 80 ),
		new THREE.MeshStandardMaterial( {
			color: emissive,
			emissive: emissive,
			emissiveIntensity: 1.4,
			roughness: 0.2
		} )
	);
	trim.rotation.x = Math.PI / 2;
	trim.position.y = height + 0.02;
	group.add( trim );

	return group;

}

function createLightPanel( width, height, color, x, y, z, rotationY = 0 ) {

	const panel = new THREE.Mesh(
		new THREE.PlaneGeometry( width, height ),
		new THREE.MeshBasicMaterial( {
			color: color,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide
		} )
	);
	panel.position.set( x, y, z );
	panel.rotation.y = rotationY;
	return panel;

}

function createAtmosphere() {

	const texture = createGlowTexture(
		'reflector-gallery-particle',
		'rgba(255,255,255,1)',
		'rgba(255,255,255,0)'
	);

	const count = 180;
	const positions = new Float32Array( count * 3 );
	const base = [];

	for ( let i = 0; i < count; i ++ ) {

		const x = ( Math.random() - 0.5 ) * 22;
		const y = 0.8 + Math.random() * 10;
		const z = - 12 + Math.random() * 13;
		positions[ i * 3 + 0 ] = x;
		positions[ i * 3 + 1 ] = y;
		positions[ i * 3 + 2 ] = z;
		base.push( {
			x,
			y,
			z,
			phase: Math.random() * Math.PI * 2,
			drift: 0.15 + Math.random() * 0.28,
			amp: 0.08 + Math.random() * 0.18
		} );

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

	const points = new THREE.Points(
		geometry,
		new THREE.PointsMaterial( {
			map: texture,
			size: 0.12,
			transparent: true,
			opacity: 0.28,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			color: 0xdfeaff
		} )
	);

	return { points, positions, base };

}

function applyMaterialMood( object, tint ) {

	object.traverse( ( child ) => {

		if ( ! child.isMesh ) return;

		child.castShadow = true;
		child.receiveShadow = true;

		if ( Array.isArray( child.material ) ) {

			child.material.forEach( ( material ) => {

				material.envMapIntensity = Math.max( material.envMapIntensity || 1, 1.6 );

			} );

		} else if ( child.material ) {

			child.material.envMapIntensity = Math.max( child.material.envMapIntensity || 1, 1.6 );

			if ( child.material.color && tint ) {

				child.material.color.lerp( new THREE.Color( tint ), 0.04 );

			}

		}

	} );

}

export function buildReflectorGalleryScene( scene, renderer ) {

	scene.fog = new THREE.FogExp2( 0x09111d, 0.04 );
	scene.background = new THREE.Color( 0x070d18 );

	loadEnvironment( renderer, scene );

	const state = {
		turntables: [],
		heroObjects: [],
		atmosphere: null,
		update() {}
	};

	scene.add( createBackdrop() );

	const floorGlow = new THREE.Mesh(
		new THREE.CircleGeometry( 11.5, 80 ),
		new THREE.MeshBasicMaterial( {
			map: createGlowTexture( 'reflector-gallery-floor-glow', 'rgba(69,188,255,1)', 'rgba(69,188,255,0)' ),
			color: 0x6edcff,
			transparent: true,
			opacity: 0.08,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		} )
	);
	floorGlow.rotation.x = - Math.PI / 2;
	floorGlow.position.set( 0, 0.025, - 1.4 );
	scene.add( floorGlow );

	const mainLight = new THREE.SpotLight( 0xffe5bf, 90, 42, Math.PI * 0.2, 0.48, 1.15 );
	mainLight.position.set( 0, 14, 4 );
	mainLight.target.position.set( 0, 1.8, - 2.2 );
	mainLight.castShadow = true;
	mainLight.shadow.mapSize.set( 2048, 2048 );
	mainLight.shadow.bias = - 0.0001;
	scene.add( mainLight );
	scene.add( mainLight.target );

	const cyanRim = new THREE.PointLight( 0x3cd5ff, 18, 30, 2 );
	cyanRim.position.set( - 11, 5.5, - 2 );
	scene.add( cyanRim );

	const magentaRim = new THREE.PointLight( 0xff4ec8, 15, 24, 2 );
	magentaRim.position.set( 11, 4.5, - 5 );
	scene.add( magentaRim );

	const fill = new THREE.HemisphereLight( 0xcfe1ff, 0x1e0d23, 0.8 );
	scene.add( fill );

	scene.add( createLightPanel( 3.2, 8.6, 0x52d6ff, - 9.2, 5.8, - 7.6, Math.PI * 0.1 ) );
	scene.add( createLightPanel( 3.2, 8.6, 0xff5fd7, 9.2, 5.8, - 7.6, - Math.PI * 0.1 ) );
	scene.add( createLightPanel( 5.8, 1.4, 0xffd28c, 0, 8.6, - 9.6, 0 ) );

	const pedestalDefs = [
		{ pos: new THREE.Vector3( - 6.1, 0, - 1.2 ), radius: 1.75, height: 1.05, color: 0x101826, emissive: 0x52d6ff, path: MODELS + 'SheenChair.glb', modelHeight: 2.5, tilt: 0.06 },
		{ pos: new THREE.Vector3( 0, 0, - 2.5 ), radius: 1.55, height: 1.35, color: 0x17121f, emissive: 0xffcf88, path: MODELS + 'IridescenceLamp.glb', modelHeight: 3.1, tilt: 0 },
		{ pos: new THREE.Vector3( 6.1, 0, - 1.1 ), radius: 1.6, height: 1.15, color: 0x17111d, emissive: 0xff5fd7, path: MODELS + 'AnisotropyBarnLamp.glb', modelHeight: 2.2, tilt: - 0.05 }
	];

	for ( const def of pedestalDefs ) {

		const pedestal = createPedestal( def.radius, def.height, def.color, def.emissive );
		pedestal.position.copy( def.pos );
		scene.add( pedestal );
		state.turntables.push( pedestal );

		loadModel( def.path ).then( ( modelScene ) => {

			if ( ! modelScene ) return;

			const model = modelScene.clone( true );
			normalizeToHeight( model, def.modelHeight );
			applyMaterialMood( model, def.emissive );

			model.position.set( def.pos.x, def.height, def.pos.z );
			model.rotation.y = def.path.includes( 'Chair' ) ? Math.PI * 0.92 : def.path.includes( 'Anisotropy' ) ? - Math.PI * 0.16 : Math.PI * 0.06;
			model.rotation.z = def.tilt;
			scene.add( model );
			state.heroObjects.push( model );

		} );

	}

	const halo = new THREE.Mesh(
		new THREE.TorusGeometry( 9.5, 0.08, 20, 120 ),
		new THREE.MeshBasicMaterial( {
			color: 0x83d7ff,
			transparent: true,
			opacity: 0.18
		} )
	);
	halo.rotation.x = Math.PI / 2;
	halo.position.set( 0, 0.04, - 1.7 );
	scene.add( halo );

	const atmosphere = createAtmosphere();
	scene.add( atmosphere.points );
	state.atmosphere = atmosphere;

	state.update = ( time ) => {

		state.heroObjects.forEach( ( object, index ) => {

			object.rotation.y += 0.0018 + index * 0.00035;
			object.position.y += Math.sin( time * 0.7 + index * 1.8 ) * 0.0008;

		} );

		const positions = state.atmosphere.positions;
		state.atmosphere.base.forEach( ( mote, index ) => {

			positions[ index * 3 + 0 ] = mote.x + Math.sin( time * mote.drift + mote.phase ) * mote.amp;
			positions[ index * 3 + 1 ] = mote.y + Math.cos( time * mote.drift * 0.7 + mote.phase ) * mote.amp * 0.6;
			positions[ index * 3 + 2 ] = mote.z + Math.sin( time * mote.drift * 0.45 + mote.phase ) * mote.amp * 0.4;

		} );
		state.atmosphere.points.geometry.attributes.position.needsUpdate = true;

	};

	return state;

}
