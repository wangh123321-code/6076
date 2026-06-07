export class BufferManager {
    constructor(gl) {
        this.gl = gl;
        this.buffers = new Map();
        this.vertexArrays = new Map();
    }

    createBuffer(name, data, usage = this.gl.STATIC_DRAW, target = this.gl.ARRAY_BUFFER) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, usage);
        gl.bindBuffer(target, null);

        this.buffers.set(name, { buffer, target, usage, byteLength: data.byteLength });
        return buffer;
    }

    updateBuffer(name, data, offset = 0) {
        const bufferInfo = this.buffers.get(name);
        if (!bufferInfo) {
            throw new Error(`Buffer ${name} not found`);
        }

        const gl = this.gl;
        gl.bindBuffer(bufferInfo.target, bufferInfo.buffer);
        gl.bufferSubData(bufferInfo.target, offset, data);
        gl.bindBuffer(bufferInfo.target, null);
    }

    createOrUpdateBuffer(name, data, usage = this.gl.STATIC_DRAW, target = this.gl.ARRAY_BUFFER) {
        const existing = this.buffers.get(name);
        if (existing && existing.byteLength >= data.byteLength) {
            this.updateBuffer(name, data);
            return existing.buffer;
        } else {
            if (existing) {
                this.deleteBuffer(name);
            }
            return this.createBuffer(name, data, usage, target);
        }
    }

    getBuffer(name) {
        const bufferInfo = this.buffers.get(name);
        return bufferInfo ? bufferInfo.buffer : null;
    }

    deleteBuffer(name) {
        const bufferInfo = this.buffers.get(name);
        if (bufferInfo) {
            this.gl.deleteBuffer(bufferInfo.buffer);
            this.buffers.delete(name);
        }
    }

    createVertexArray(name, configs, options = {}) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        for (const config of configs) {
            const bufferInfo = this.buffers.get(config.bufferName);
            if (!bufferInfo) {
                throw new Error(`Buffer ${config.bufferName} not found`);
            }

            gl.bindBuffer(bufferInfo.target, bufferInfo.buffer);
            gl.enableVertexAttribArray(config.attribute);
            
            const type = config.type || gl.FLOAT;
            const normalized = config.normalized || false;
            const stride = config.stride || 0;
            const offset = config.offset || 0;

            if (type === gl.INT || type === gl.UNSIGNED_INT) {
                gl.vertexAttribIPointer(config.attribute, config.size, type, stride, offset);
            } else {
                gl.vertexAttribPointer(config.attribute, config.size, type, normalized, stride, offset);
            }

            if (config.divisor !== undefined) {
                gl.vertexAttribDivisor(config.attribute, config.divisor);
            }
        }

        if (options.indexBuffer) {
            const indexBufferInfo = this.buffers.get(options.indexBuffer);
            if (indexBufferInfo) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferInfo.buffer);
            }
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        this.vertexArrays.set(name, vao);
        return vao;
    }

    getVertexArray(name) {
        return this.vertexArrays.get(name);
    }

    deleteVertexArray(name) {
        const vao = this.vertexArrays.get(name);
        if (vao) {
            this.gl.deleteVertexArray(vao);
            this.vertexArrays.delete(name);
        }
    }

    dispose() {
        for (const name of this.buffers.keys()) {
            this.deleteBuffer(name);
        }
        for (const name of this.vertexArrays.keys()) {
            this.deleteVertexArray(name);
        }
    }
}

export function generateSphereGeometry(segments = 16, rings = 12) {
    const positions = [];
    const normals = [];
    const indices = [];

    for (let ring = 0; ring <= rings; ring++) {
        const phi = (ring / rings) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let seg = 0; seg <= segments; seg++) {
            const theta = (seg / segments) * Math.PI * 2;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            const x = cosTheta * sinPhi;
            const y = cosPhi;
            const z = sinTheta * sinPhi;

            positions.push(x, y, z);
            normals.push(x, y, z);
        }
    }

    for (let ring = 0; ring < rings; ring++) {
        for (let seg = 0; seg < segments; seg++) {
            const first = ring * (segments + 1) + seg;
            const second = first + segments + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices)
    };
}

export function generateCubeGeometry(size = 1) {
    const s = size / 2;
    const positions = new Float32Array([
        -s, -s,  s,   s, -s,  s,   s,  s,  s,  -s,  s,  s,
         s, -s, -s,  -s, -s, -s,  -s,  s, -s,   s,  s, -s,
        -s,  s,  s,   s,  s,  s,   s,  s, -s,  -s,  s, -s,
        -s, -s, -s,   s, -s, -s,   s, -s,  s,  -s, -s,  s,
         s, -s,  s,   s, -s, -s,   s,  s, -s,   s,  s,  s,
        -s, -s, -s,  -s, -s,  s,  -s,  s,  s,  -s,  s, -s
    ]);

    const normals = new Float32Array([
         0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
         0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
         0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
         0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
         1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
        -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
    ]);

    const indices = new Uint16Array([
         0,  1,  2,   0,  2,  3,
         4,  5,  6,   4,  6,  7,
         8,  9, 10,   8, 10, 11,
        12, 13, 14,  12, 14, 15,
        16, 17, 18,  16, 18, 19,
        20, 21, 22,  20, 22, 23
    ]);

    return { positions, normals, indices };
}

export function generateGridGeometry(size = 100, divisions = 100) {
    const positions = [];
    const colors = [];
    const step = size / divisions;
    const halfSize = size / 2;

    const majorColor = [0.3, 0.5, 0.8, 0.6];
    const minorColor = [0.2, 0.3, 0.5, 0.3];

    for (let i = 0; i <= divisions; i++) {
        const pos = -halfSize + i * step;
        const isMajor = (i % 10 === 0);
        const color = isMajor ? majorColor : minorColor;

        positions.push(pos, 0, -halfSize);
        positions.push(pos, 0, halfSize);
        colors.push(...color, ...color);

        positions.push(-halfSize, 0, pos);
        positions.push(halfSize, 0, pos);
        colors.push(...color, ...color);
    }

    return {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors)
    };
}

export function generateLineGeometry(points, colors) {
    const positions = new Float32Array(points.length * 3);
    const colorData = new Float32Array(points.length * 4);

    for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i][0];
        positions[i * 3 + 1] = points[i][1];
        positions[i * 3 + 2] = points[i][2];

        const color = colors[i] || [1, 1, 1, 1];
        colorData[i * 4] = color[0];
        colorData[i * 4 + 1] = color[1];
        colorData[i * 4 + 2] = color[2];
        colorData[i * 4 + 3] = color[3];
    }

    const indices = new Uint16Array(points.length - 1);
    for (let i = 0; i < points.length - 1; i++) {
        indices[i] = i;
    }

    return { positions, colors: colorData, indices };
}
