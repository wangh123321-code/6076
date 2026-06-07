import { vec3 } from '../math/vec3.js';
import { mat4 } from '../math/mat4.js';

export class CameraController {
    constructor(renderer, canvas) {
        this.renderer = renderer;
        this.canvas = canvas;
        this.camera = renderer.camera;

        this.targetDistance = 8;
        this.minDistance = 2;
        this.maxDistance = 30;

        this.azimuth = 0;
        this.elevation = 0.4;
        this.minElevation = -Math.PI / 2 + 0.1;
        this.maxElevation = Math.PI / 2 - 0.1;

        this.panOffset = vec3.create(0, 0, 0);
        this.autoRotate = false;
        this.autoRotateSpeed = 0.5;

        this.isDragging = false;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.002;
        this.panSpeed = 0.003;

        this.initialPosition = vec3.create(0, 3, 8);
        this.initialTarget = vec3.create(0, 1, 0);

        this._initEventListeners();
        this._updateCamera();
    }

    _initEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _onMouseDown(e) {
        e.preventDefault();
        
        if (e.button === 0) {
            this.isDragging = true;
        } else if (e.button === 2) {
            this.isPanning = true;
        } else if (e.button === 1) {
            this.isPanning = true;
        }

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    _onMouseMove(e) {
        if (!this.isDragging && !this.isPanning) return;

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (this.isDragging) {
            this._rotate(deltaX, deltaY);
        } else if (this.isPanning) {
            this._pan(deltaX, deltaY);
        }
    }

    _onMouseUp(e) {
        this.isDragging = false;
        this.isPanning = false;
    }

    _onWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        this._zoom(e.deltaY);
    }

    _onTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            this._pinchStart(e);
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.isDragging) {
            const deltaX = e.touches[0].clientX - this.lastMouseX;
            const deltaY = e.touches[0].clientY - this.lastMouseY;
            
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
            
            this._rotate(deltaX, deltaY);
        } else if (e.touches.length === 2) {
            this._pinchMove(e);
        }
    }

    _onTouchEnd(e) {
        this.isDragging = false;
        this.isPanning = false;
        this._pinchEnd();
    }

    _pinchStart(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this._initialPinchDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        this._initialPinchCenter = [
            (touch1.clientX + touch2.clientX) / 2,
            (touch1.clientY + touch2.clientY) / 2
        ];
    }

    _pinchMove(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        const center = [
            (touch1.clientX + touch2.clientX) / 2,
            (touch1.clientY + touch2.clientY) / 2
        ];

        if (this._initialPinchDistance) {
            const deltaZoom = this._initialPinchDistance - distance;
            this._zoom(deltaZoom * 2);
        }

        if (this._initialPinchCenter) {
            const deltaX = center[0] - this._initialPinchCenter[0];
            const deltaY = center[1] - this._initialPinchCenter[1];
            this._pan(-deltaX, -deltaY);
        }

        this._initialPinchDistance = distance;
        this._initialPinchCenter = center;
    }

    _pinchEnd() {
        this._initialPinchDistance = null;
        this._initialPinchCenter = null;
    }

    _rotate(deltaX, deltaY) {
        this.azimuth -= deltaX * this.rotateSpeed;
        this.elevation += deltaY * this.rotateSpeed;

        this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
        
        this._updateCamera();
    }

    _zoom(deltaY) {
        const factor = Math.exp(deltaY * this.zoomSpeed);
        this.targetDistance *= factor;
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
        
        this._updateCamera();
    }

    _pan(deltaX, deltaY) {
        const right = vec3.create();
        const up = vec3.create();
        
        const look = vec3.create();
        vec3.subtract(look, this.camera.target, this.camera.position);
        vec3.normalize(look, look);
        
        vec3.cross(right, look, this.camera.up);
        vec3.normalize(right, right);
        vec3.cross(up, right, look);
        vec3.normalize(up, up);

        const panAmount = this.targetDistance * this.panSpeed;
        this.panOffset[0] -= right[0] * deltaX * panAmount + up[0] * deltaY * panAmount;
        this.panOffset[1] -= right[1] * deltaX * panAmount + up[1] * deltaY * panAmount;
        this.panOffset[2] -= right[2] * deltaX * panAmount + up[2] * deltaY * panAmount;
        
        this._updateCamera();
    }

    _updateCamera() {
        const target = vec3.create();
        vec3.add(target, this.initialTarget, this.panOffset);

        const x = this.targetDistance * Math.cos(this.elevation) * Math.sin(this.azimuth);
        const y = this.targetDistance * Math.sin(this.elevation);
        const z = this.targetDistance * Math.cos(this.elevation) * Math.cos(this.azimuth);

        this.camera.position[0] = target[0] + x;
        this.camera.position[1] = target[1] + y;
        this.camera.position[2] = target[2] + z;

        this.camera.target[0] = target[0];
        this.camera.target[1] = target[1];
        this.camera.target[2] = target[2];
    }

    update(deltaTime) {
        if (this.autoRotate && !this.isDragging && !this.isPanning) {
            this.azimuth += this.autoRotateSpeed * deltaTime;
            this._updateCamera();
        }
    }

    reset() {
        this.azimuth = 0;
        this.elevation = 0.4;
        this.targetDistance = 8;
        this.panOffset = vec3.create(0, 0, 0);
        this._updateCamera();
    }

    setFrontView() {
        this.azimuth = 0;
        this.elevation = 0;
        this.panOffset = vec3.create(0, 0, 0);
        this._updateCamera();
    }

    setSideView() {
        this.azimuth = Math.PI / 2;
        this.elevation = 0;
        this.panOffset = vec3.create(0, 0, 0);
        this._updateCamera();
    }

    setTopView() {
        this.azimuth = 0;
        this.elevation = Math.PI / 2 - 0.01;
        this.panOffset = vec3.create(0, 0, 0);
        this._updateCamera();
    }

    setTarget(target) {
        this.initialTarget[0] = target[0];
        this.initialTarget[1] = target[1];
        this.initialTarget[2] = target[2];
        this._updateCamera();
    }

    setDistance(distance) {
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
        this._updateCamera();
    }

    fitToBounds(min, max) {
        const center = vec3.create(
            (min[0] + max[0]) / 2,
            (min[1] + max[1]) / 2,
            (min[2] + max[2]) / 2
        );

        const size = vec3.create(
            max[0] - min[0],
            max[1] - min[1],
            max[2] - min[2]
        );

        const maxSize = Math.max(size[0], size[1], size[2]);
        const fov = this.camera.fov;
        const distance = maxSize / (2 * Math.tan(fov / 2)) * 1.5;

        this.initialTarget[0] = center[0];
        this.initialTarget[1] = center[1];
        this.initialTarget[2] = center[2];
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
        this.panOffset = vec3.create(0, 0, 0);
        this._updateCamera();
    }

    getViewMatrix() {
        return this.renderer.viewMatrix;
    }

    getProjectionMatrix() {
        return this.renderer.projectionMatrix;
    }

    setAutoRotate(enabled, speed = 0.5) {
        this.autoRotate = enabled;
        this.autoRotateSpeed = speed;
    }
}
