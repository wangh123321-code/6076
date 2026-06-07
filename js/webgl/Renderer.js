import { mat4 } from '../math/mat4.js';
import { vec3 } from '../math/vec3.js';
import { Shaders, createProgramFromSources } from './shaders.js';
import { BufferManager, generateSphereGeometry, generateGridGeometry } from './buffers.js';

export class Renderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = null;
        this.bufferManager = null;
        this.programs = {};
        this.locations = {};
        
        this.backgroundColor = options.backgroundColor || [0.05, 0.08, 0.15, 1];
        
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.modelMatrix = mat4.create();
        
        this.camera = {
            position: vec3.create(0, 3, 8),
            target: vec3.create(0, 1, 0),
            up: vec3.create(0, 1, 0),
            fov: Math.PI / 4,
            near: 0.1,
            far: 200
        };
        
        this.lightDirection = vec3.create(0.5, 0.8, 0.3);
        
        this._init();
    }

    _init() {
        const gl = this.canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });

        if (!gl) {
            throw new Error('WebGL2 not supported');
        }

        this.gl = gl;
        this.bufferManager = new BufferManager(gl);

        this._initPrograms();
        this._initGeometries();
        this._initState();

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    _initPrograms() {
        const gl = this.gl;

        this.programs.vertexColor = createProgramFromSources(gl, Shaders.vertexColor);
        this.programs.vertexUniformColor = createProgramFromSources(gl, Shaders.vertexUniformColor);
        this.programs.vertexPoint = createProgramFromSources(gl, Shaders.vertexPoint);
        this.programs.vertexLine = createProgramFromSources(gl, Shaders.vertexLine);
        this.programs.sphere = createProgramFromSources(gl, Shaders.sphere);
        this.programs.grid = createProgramFromSources(gl, Shaders.grid);

        for (const [name, program] of Object.entries(this.programs)) {
            if (!program) {
                throw new Error(`Failed to create program: ${name}`);
            }
            this._cacheUniformLocations(name, program);
        }
    }

    _cacheUniformLocations(programName, program) {
        const gl = this.gl;
        const locations = {
            aPosition: gl.getAttribLocation(program, 'aPosition'),
            aColor: gl.getAttribLocation(program, 'aColor'),
            aNormal: gl.getAttribLocation(program, 'aNormal'),
            aSize: gl.getAttribLocation(program, 'aSize'),
            uProjection: gl.getUniformLocation(program, 'uProjection'),
            uView: gl.getUniformLocation(program, 'uView'),
            uModel: gl.getUniformLocation(program, 'uModel'),
            uColor: gl.getUniformLocation(program, 'uColor'),
            uLightDir: gl.getUniformLocation(program, 'uLightDir'),
            uAmbient: gl.getUniformLocation(program, 'uAmbient'),
            uMajorColor: gl.getUniformLocation(program, 'uMajorColor'),
            uMinorColor: gl.getUniformLocation(program, 'uMinorColor'),
            uGridSize: gl.getUniformLocation(program, 'uGridSize')
        };
        this.locations[programName] = locations;
    }

    _initGeometries() {
        const sphere = generateSphereGeometry(16, 12);
        this.bufferManager.createBuffer('spherePositions', sphere.positions);
        this.bufferManager.createBuffer('sphereNormals', sphere.normals);
        this.bufferManager.createBuffer('sphereIndices', sphere.indices, this.gl.STATIC_DRAW, this.gl.ELEMENT_ARRAY_BUFFER);
        
        this.bufferManager.createVertexArray('sphere', [
            { bufferName: 'spherePositions', attribute: this.locations.sphere.aPosition, size: 3 },
            { bufferName: 'sphereNormals', attribute: this.locations.sphere.aNormal, size: 3 }
        ], { indexBuffer: 'sphereIndices' });

        const grid = generateGridGeometry(120, 120);
        this.bufferManager.createBuffer('gridPositions', grid.positions);
        this.bufferManager.createBuffer('gridColors', grid.colors);
        this.bufferManager.createVertexArray('grid', [
            { bufferName: 'gridPositions', attribute: this.locations.grid.aPosition, size: 3 },
            { bufferName: 'gridColors', attribute: this.locations.grid.aColor, size: 4 }
        ]);

        this.sphereIndexCount = sphere.indices.length;
        this.gridVertexCount = grid.positions.length / 3;
    }

    _initState() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width * dpr);
        const height = Math.max(1, rect.height * dpr);
        
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        
        this.gl.viewport(0, 0, width, height);
        this._updateProjectionMatrix();
    }

    _updateProjectionMatrix() {
        const aspect = this.canvas.width / this.canvas.height;
        mat4.perspective(this.projectionMatrix, this.camera.fov, aspect, this.camera.near, this.camera.far);
    }

    beginFrame() {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(...this.backgroundColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.lookAt(this.viewMatrix, this.camera.position, this.camera.target, this.camera.up);
        mat4.identity(this.modelMatrix);
    }

    useProgram(name) {
        const program = this.programs[name];
        if (!program) {
            throw new Error(`Program ${name} not found`);
        }
        this.gl.useProgram(program);
        this.currentProgram = name;
        return program;
    }

    setMatrices(programName) {
        const gl = this.gl;
        const locs = this.locations[programName];

        if (locs.uProjection) {
            gl.uniformMatrix4fv(locs.uProjection, false, this.projectionMatrix);
        }
        if (locs.uView) {
            gl.uniformMatrix4fv(locs.uView, false, this.viewMatrix);
        }
        if (locs.uModel) {
            gl.uniformMatrix4fv(locs.uModel, false, this.modelMatrix);
        }
    }

    drawGrid(options = {}) {
        const gl = this.gl;
        const programName = 'grid';
        const vao = this.bufferManager.getVertexArray('grid');

        if (!vao) return;

        this.useProgram(programName);
        this.setMatrices(programName);

        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, this.gridVertexCount);
        gl.bindVertexArray(null);
    }

    drawSphere(position, radius, color, options = {}) {
        const gl = this.gl;
        const programName = 'sphere';
        const locs = this.locations[programName];
        const vao = this.bufferManager.getVertexArray('sphere');

        if (!vao) return;

        this.useProgram(programName);

        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, position);
        mat4.scale(this.modelMatrix, this.modelMatrix, [radius, radius, radius]);

        this.setMatrices(programName);

        const ambient = options.ambient !== undefined ? options.ambient : 0.3;

        gl.uniform4fv(locs.uColor, color);
        gl.uniform3fv(locs.uLightDir, this.lightDirection);
        gl.uniform1f(locs.uAmbient, ambient);

        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    drawLines(positions, colors, lineWidth = 2) {
        const gl = this.gl;
        const programName = 'vertexLine';
        const locs = this.locations[programName];

        if (positions.length < 2) return;

        const positionBuffer = new Float32Array(positions.length * 3);
        const colorBuffer = new Float32Array(positions.length * 4);

        for (let i = 0; i < positions.length; i++) {
            positionBuffer[i * 3] = positions[i][0];
            positionBuffer[i * 3 + 1] = positions[i][1];
            positionBuffer[i * 3 + 2] = positions[i][2];

            const color = colors[i] || [1, 1, 1, 1];
            colorBuffer[i * 4] = color[0];
            colorBuffer[i * 4 + 1] = color[1];
            colorBuffer[i * 4 + 2] = color[2];
            colorBuffer[i * 4 + 3] = color[3];
        }

        this.bufferManager.createOrUpdateBuffer('dynamicLinePositions', positionBuffer, gl.DYNAMIC_DRAW);
        this.bufferManager.createOrUpdateBuffer('dynamicLineColors', colorBuffer, gl.DYNAMIC_DRAW);

        this.bufferManager.createVertexArray('dynamicLines', [
            { bufferName: 'dynamicLinePositions', attribute: locs.aPosition, size: 3 },
            { bufferName: 'dynamicLineColors', attribute: locs.aColor, size: 4 }
        ]);

        this.useProgram(programName);
        this.setMatrices(programName);

        const vao = this.bufferManager.getVertexArray('dynamicLines');
        gl.bindVertexArray(vao);
        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINE_STRIP, 0, positions.length);
        gl.bindVertexArray(null);
    }

    drawLineSegments(startPoints, endPoints, colors, lineWidth = 2) {
        const gl = this.gl;
        const programName = 'vertexLine';
        const locs = this.locations[programName];

        const lineCount = Math.min(startPoints.length, endPoints.length);
        if (lineCount === 0) return;

        const positionBuffer = new Float32Array(lineCount * 6);
        const colorBuffer = new Float32Array(lineCount * 8);

        for (let i = 0; i < lineCount; i++) {
            const start = startPoints[i];
            const end = endPoints[i];
            const color = colors[i] || [1, 1, 1, 1];

            positionBuffer[i * 6] = start[0];
            positionBuffer[i * 6 + 1] = start[1];
            positionBuffer[i * 6 + 2] = start[2];
            positionBuffer[i * 6 + 3] = end[0];
            positionBuffer[i * 6 + 4] = end[1];
            positionBuffer[i * 6 + 5] = end[2];

            for (let j = 0; j < 2; j++) {
                colorBuffer[i * 8 + j * 4] = color[0];
                colorBuffer[i * 8 + j * 4 + 1] = color[1];
                colorBuffer[i * 8 + j * 4 + 2] = color[2];
                colorBuffer[i * 8 + j * 4 + 3] = color[3];
            }
        }

        this.bufferManager.createOrUpdateBuffer('dynamicSegmentPositions', positionBuffer, gl.DYNAMIC_DRAW);
        this.bufferManager.createOrUpdateBuffer('dynamicSegmentColors', colorBuffer, gl.DYNAMIC_DRAW);

        this.bufferManager.createVertexArray('dynamicSegments', [
            { bufferName: 'dynamicSegmentPositions', attribute: locs.aPosition, size: 3 },
            { bufferName: 'dynamicSegmentColors', attribute: locs.aColor, size: 4 }
        ]);

        this.useProgram(programName);
        this.setMatrices(programName);

        const vao = this.bufferManager.getVertexArray('dynamicSegments');
        gl.bindVertexArray(vao);
        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINES, 0, lineCount * 2);
        gl.bindVertexArray(null);
    }

    drawPoints(positions, colors, sizes) {
        const gl = this.gl;
        const programName = 'vertexPoint';
        const locs = this.locations[programName];

        if (positions.length === 0) return;

        const positionBuffer = new Float32Array(positions.length * 3);
        const colorBuffer = new Float32Array(positions.length * 4);
        const sizeBuffer = new Float32Array(positions.length);

        for (let i = 0; i < positions.length; i++) {
            positionBuffer[i * 3] = positions[i][0];
            positionBuffer[i * 3 + 1] = positions[i][1];
            positionBuffer[i * 3 + 2] = positions[i][2];

            const color = colors[i] || [1, 1, 1, 1];
            colorBuffer[i * 4] = color[0];
            colorBuffer[i * 4 + 1] = color[1];
            colorBuffer[i * 4 + 2] = color[2];
            colorBuffer[i * 4 + 3] = color[3];

            sizeBuffer[i] = sizes[i] || 5;
        }

        this.bufferManager.createOrUpdateBuffer('dynamicPointPositions', positionBuffer, gl.DYNAMIC_DRAW);
        this.bufferManager.createOrUpdateBuffer('dynamicPointColors', colorBuffer, gl.DYNAMIC_DRAW);
        this.bufferManager.createOrUpdateBuffer('dynamicPointSizes', sizeBuffer, gl.DYNAMIC_DRAW);

        this.bufferManager.createVertexArray('dynamicPoints', [
            { bufferName: 'dynamicPointPositions', attribute: locs.aPosition, size: 3 },
            { bufferName: 'dynamicPointColors', attribute: locs.aColor, size: 4 },
            { bufferName: 'dynamicPointSizes', attribute: locs.aSize, size: 1 }
        ]);

        this.useProgram(programName);
        this.setMatrices(programName);

        const vao = this.bufferManager.getVertexArray('dynamicPoints');
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, positions.length);
        gl.bindVertexArray(null);
    }

    pushModelMatrix() {
        this._modelMatrixStack = this._modelMatrixStack || [];
        this._modelMatrixStack.push(new Float32Array(this.modelMatrix));
    }

    popModelMatrix() {
        if (this._modelMatrixStack && this._modelMatrixStack.length > 0) {
            this.modelMatrix.set(this._modelMatrixStack.pop());
        }
    }

    dispose() {
        if (this.bufferManager) {
            this.bufferManager.dispose();
        }
        const gl = this.gl;
        for (const program of Object.values(this.programs)) {
            gl.deleteProgram(program);
        }
        this.programs = {};
    }
}
