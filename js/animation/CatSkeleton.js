import { vec3 } from '../math/vec3.js';
import { quat } from '../math/quat.js';

export const LimbType = {
    SPINE: 'spine',
    HEAD: 'head',
    FRONT_LEG: 'front_leg',
    BACK_LEG: 'back_leg',
    TAIL: 'tail'
};

export const JointColors = {
    [LimbType.SPINE]: [0.8, 0.8, 0.8, 1],
    [LimbType.HEAD]: [1, 0.6, 0.6, 1],
    [LimbType.FRONT_LEG]: [0.4, 0.8, 0.4, 1],
    [LimbType.BACK_LEG]: [0.4, 0.6, 1, 1],
    [LimbType.TAIL]: [1, 0.8, 0.4, 1]
};

export const CatSkeletonDefinition = {
    joints: [
        { name: 'root', parent: -1, limb: LimbType.SPINE, defaultPos: [0, 1, 0] },
        { name: 'spine1', parent: 0, limb: LimbType.SPINE, defaultPos: [0, 1.2, -0.2] },
        { name: 'spine2', parent: 1, limb: LimbType.SPINE, defaultPos: [0, 1.3, -0.5] },
        { name: 'spine3', parent: 2, limb: LimbType.SPINE, defaultPos: [0, 1.35, -0.8] },
        { name: 'neck', parent: 3, limb: LimbType.SPINE, defaultPos: [0, 1.4, -1.1] },
        { name: 'head', parent: 4, limb: LimbType.HEAD, defaultPos: [0, 1.45, -1.4] },
        { name: 'jaw', parent: 5, limb: LimbType.HEAD, defaultPos: [0, 1.35, -1.55] },
        { name: 'ear_left', parent: 5, limb: LimbType.HEAD, defaultPos: [0.15, 1.65, -1.35] },
        { name: 'ear_right', parent: 5, limb: LimbType.HEAD, defaultPos: [-0.15, 1.65, -1.35] },
        { name: 'shoulder_left', parent: 3, limb: LimbType.FRONT_LEG, defaultPos: [0.35, 1.3, -0.7] },
        { name: 'elbow_left', parent: 9, limb: LimbType.FRONT_LEG, defaultPos: [0.4, 0.8, -0.65] },
        { name: 'wrist_left', parent: 10, limb: LimbType.FRONT_LEG, defaultPos: [0.4, 0.3, -0.6] },
        { name: 'paw_left', parent: 11, limb: LimbType.FRONT_LEG, defaultPos: [0.4, 0.05, -0.58] },
        { name: 'shoulder_right', parent: 3, limb: LimbType.FRONT_LEG, defaultPos: [-0.35, 1.3, -0.7] },
        { name: 'elbow_right', parent: 13, limb: LimbType.FRONT_LEG, defaultPos: [-0.4, 0.8, -0.65] },
        { name: 'wrist_right', parent: 14, limb: LimbType.FRONT_LEG, defaultPos: [-0.4, 0.3, -0.6] },
        { name: 'paw_right', parent: 15, limb: LimbType.FRONT_LEG, defaultPos: [-0.4, 0.05, -0.58] },
        { name: 'hip_left', parent: 0, limb: LimbType.BACK_LEG, defaultPos: [0.35, 1.1, 0.3] },
        { name: 'knee_left', parent: 17, limb: LimbType.BACK_LEG, defaultPos: [0.35, 0.6, 0.4] },
        { name: 'ankle_left', parent: 18, limb: LimbType.BACK_LEG, defaultPos: [0.3, 0.2, 0.2] },
        { name: 'foot_left', parent: 19, limb: LimbType.BACK_LEG, defaultPos: [0.3, 0.05, 0.08] },
        { name: 'hip_right', parent: 0, limb: LimbType.BACK_LEG, defaultPos: [-0.35, 1.1, 0.3] },
        { name: 'knee_right', parent: 21, limb: LimbType.BACK_LEG, defaultPos: [-0.35, 0.6, 0.4] },
        { name: 'ankle_right', parent: 22, limb: LimbType.BACK_LEG, defaultPos: [-0.3, 0.2, 0.2] },
        { name: 'foot_right', parent: 23, limb: LimbType.BACK_LEG, defaultPos: [-0.3, 0.05, 0.08] },
        { name: 'tail1', parent: 0, limb: LimbType.TAIL, defaultPos: [0, 1.1, 0.5] },
        { name: 'tail2', parent: 25, limb: LimbType.TAIL, defaultPos: [0, 1, 0.9] },
        { name: 'tail3', parent: 26, limb: LimbType.TAIL, defaultPos: [0, 0.9, 1.25] },
        { name: 'tail4', parent: 27, limb: LimbType.TAIL, defaultPos: [0, 0.8, 1.5] },
        { name: 'tail5', parent: 28, limb: LimbType.TAIL, defaultPos: [0, 0.75, 1.7] }
    ],

    getJointIndex(name) {
        return this.joints.findIndex(j => j.name === name);
    },

    getJointName(index) {
        return this.joints[index]?.name || '';
    },

    getJointLimb(index) {
        return this.joints[index]?.limb || LimbType.SPINE;
    }
};

export class CatSkeletonPose {
    constructor() {
        const jointCount = CatSkeletonDefinition.joints.length;
        this.positions = new Float32Array(jointCount * 3);
        this.rotations = new Float32Array(jointCount * 4);
        
        for (let i = 0; i < jointCount; i++) {
            const joint = CatSkeletonDefinition.joints[i];
            this.positions[i * 3] = joint.defaultPos[0];
            this.positions[i * 3 + 1] = joint.defaultPos[1];
            this.positions[i * 3 + 2] = joint.defaultPos[2];
            
            this.rotations[i * 4] = 0;
            this.rotations[i * 4 + 1] = 0;
            this.rotations[i * 4 + 2] = 0;
            this.rotations[i * 4 + 3] = 1;
        }
    }

    getJointCount() {
        return this.positions.length / 3;
    }

    getPosition(index, out) {
        out = out || vec3.create();
        out[0] = this.positions[index * 3];
        out[1] = this.positions[index * 3 + 1];
        out[2] = this.positions[index * 3 + 2];
        return out;
    }

    setPosition(index, pos) {
        this.positions[index * 3] = pos[0];
        this.positions[index * 3 + 1] = pos[1];
        this.positions[index * 3 + 2] = pos[2];
    }

    getRotation(index, out) {
        out = out || quat.create();
        out[0] = this.rotations[index * 4];
        out[1] = this.rotations[index * 4 + 1];
        out[2] = this.rotations[index * 4 + 2];
        out[3] = this.rotations[index * 4 + 3];
        return out;
    }

    setRotation(index, rot) {
        this.rotations[index * 4] = rot[0];
        this.rotations[index * 4 + 1] = rot[1];
        this.rotations[index * 4 + 2] = rot[2];
        this.rotations[index * 4 + 3] = rot[3];
    }

    copyFrom(other) {
        this.positions.set(other.positions);
        this.rotations.set(other.rotations);
    }

    lerp(target, t) {
        const result = new CatSkeletonPose();
        const jointCount = this.getJointCount();
        
        for (let i = 0; i < jointCount; i++) {
            const posA = this.getPosition(i);
            const posB = target.getPosition(i);
            const rotA = this.getRotation(i);
            const rotB = target.getRotation(i);
            
            const posOut = vec3.create();
            vec3.lerp(posOut, posA, posB, t);
            result.setPosition(i, posOut);
            
            const rotOut = quat.create();
            quat.slerp(rotOut, rotA, rotB, t);
            result.setRotation(i, rotOut);
        }
        
        return result;
    }

    clone() {
        const result = new CatSkeletonPose();
        result.copyFrom(this);
        return result;
    }
}

export class CatSkeletonRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        this.boneColors = {
            [LimbType.SPINE]: [0.7, 0.7, 0.7, 1],
            [LimbType.HEAD]: [1, 0.5, 0.5, 1],
            [LimbType.FRONT_LEG]: [0.3, 0.9, 0.3, 1],
            [LimbType.BACK_LEG]: [0.3, 0.5, 1, 1],
            [LimbType.TAIL]: [1, 0.7, 0.3, 1]
        };
    }

    render(pose, options = {}) {
        const renderer = this.renderer;
        const showSkeleton = options.showSkeleton !== false;
        const showJoints = options.showJoints !== false;
        const showLabels = options.showLabels === true;
        const highlightLimb = options.highlightLimb || null;

        const jointCount = pose.getJointCount();
        const worldPositions = [];

        for (let i = 0; i < jointCount; i++) {
            const pos = vec3.create();
            pose.getPosition(i, pos);
            worldPositions.push(pos);
        }

        if (showSkeleton) {
            const startPoints = [];
            const endPoints = [];
            const colors = [];

            for (let i = 0; i < jointCount; i++) {
                const joint = CatSkeletonDefinition.joints[i];
                if (joint.parent >= 0) {
                    startPoints.push(worldPositions[joint.parent]);
                    endPoints.push(worldPositions[i]);
                    
                    let color = this.boneColors[joint.limb];
                    if (highlightLimb && joint.limb !== highlightLimb) {
                        color = [...color];
                        color[3] = 0.2;
                    }
                    colors.push(color);
                }
            }

            renderer.drawLineSegments(startPoints, endPoints, colors, 3);
        }

        if (showJoints) {
            const positions = [];
            const colors = [];
            const sizes = [];

            for (let i = 0; i < jointCount; i++) {
                const joint = CatSkeletonDefinition.joints[i];
                let color = JointColors[joint.limb];
                
                if (highlightLimb && joint.limb !== highlightLimb) {
                    color = [...color];
                    color[3] = 0.3;
                }

                const radius = this.getJointRadius(i);
                renderer.drawSphere(worldPositions[i], radius, color, { ambient: 0.4 });
            }
        }
    }

    getJointRadius(index) {
        const name = CatSkeletonDefinition.getJointName(index);
        if (name === 'head') return 0.12;
        if (name.includes('paw') || name.includes('foot')) return 0.05;
        if (name.includes('tail')) return 0.03;
        if (name.includes('ear')) return 0.03;
        return 0.06;
    }

    getJointWorldPosition(pose, index) {
        const pos = vec3.create();
        pose.getPosition(index, pos);
        return pos;
    }

    getLimbJoints(limbType) {
        return CatSkeletonDefinition.joints
            .map((joint, index) => joint.limb === limbType ? index : -1)
            .filter(i => i >= 0);
    }

    getFrontLeftLegJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('shoulder_left'),
            CatSkeletonDefinition.getJointIndex('elbow_left'),
            CatSkeletonDefinition.getJointIndex('wrist_left'),
            CatSkeletonDefinition.getJointIndex('paw_left')
        ];
    }

    getFrontRightLegJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('shoulder_right'),
            CatSkeletonDefinition.getJointIndex('elbow_right'),
            CatSkeletonDefinition.getJointIndex('wrist_right'),
            CatSkeletonDefinition.getJointIndex('paw_right')
        ];
    }

    getBackLeftLegJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('hip_left'),
            CatSkeletonDefinition.getJointIndex('knee_left'),
            CatSkeletonDefinition.getJointIndex('ankle_left'),
            CatSkeletonDefinition.getJointIndex('foot_left')
        ];
    }

    getBackRightLegJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('hip_right'),
            CatSkeletonDefinition.getJointIndex('knee_right'),
            CatSkeletonDefinition.getJointIndex('ankle_right'),
            CatSkeletonDefinition.getJointIndex('foot_right')
        ];
    }

    getTailJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('tail1'),
            CatSkeletonDefinition.getJointIndex('tail2'),
            CatSkeletonDefinition.getJointIndex('tail3'),
            CatSkeletonDefinition.getJointIndex('tail4'),
            CatSkeletonDefinition.getJointIndex('tail5')
        ];
    }

    getHeadJoints() {
        return [
            CatSkeletonDefinition.getJointIndex('head'),
            CatSkeletonDefinition.getJointIndex('jaw'),
            CatSkeletonDefinition.getJointIndex('ear_left'),
            CatSkeletonDefinition.getJointIndex('ear_right')
        ];
    }
}
