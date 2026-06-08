import { vec3 } from '../math/vec3.js';
import { quat } from '../math/quat.js';
import { CoordinateSystem, JointNameMapping, mapJointName, guessJointMapping, createInverseMapping } from '../math/CoordinateSystem.js';
import { CatSkeletonDefinition, CatSkeletonPose } from '../animation/CatSkeleton.js';

export const BVHChannelType = {
    X_POSITION: 'Xposition',
    Y_POSITION: 'Yposition',
    Z_POSITION: 'Zposition',
    X_ROTATION: 'Xrotation',
    Y_ROTATION: 'Yrotation',
    Z_ROTATION: 'Zrotation'
};

export class BVHJoint {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
        this.children = [];
        this.offset = vec3.create();
        this.channels = [];
        this.channelOrder = [];
        this.isEndSite = false;
        this.endSiteOffset = vec3.create();
    }

    addChild(child) {
        this.children.push(child);
    }
}

export class BVHSkeleton {
    constructor() {
        this.root = null;
        this.joints = [];
        this.jointMap = {};
        this.motionData = [];
        this.frameCount = 0;
        this.frameTime = 1 / 60;
        this.sourceUpAxis = 'y-up';
        this.sourceUnit = 'centimeters';
        this.rotationOrder = 'ZXY';
    }

    getJointIndex(name) {
        return this.joints.findIndex(j => j.name === name);
    }

    getJoint(name) {
        return this.jointMap[name];
    }

    traverse(callback, joint = this.root, parentIndex = -1) {
        if (!joint) return;
        const index = this.joints.indexOf(joint);
        callback(joint, index, parentIndex);
        for (const child of joint.children) {
            this.traverse(callback, child, index);
        }
    }

    getChannelCount() {
        let count = 0;
        for (const joint of this.joints) {
            count += joint.channels.length;
        }
        return count;
    }
}

export class BVHParser {
    constructor() {
        this.options = {
            targetUpAxis: 'z-up',
            targetUnit: 'meters',
            rotationOrder: 'ZXY',
            mappingType: 'motionBuilder',
            autoGuessMapping: true
        };
    }

    parse(text, options = {}) {
        Object.assign(this.options, options);

        const lines = this._splitLines(text);
        if (lines.length === 0) {
            throw new Error('Empty BVH file');
        }

        const skeleton = new BVHSkeleton();
        skeleton.rotationOrder = this.options.rotationOrder;
        skeleton.sourceUpAxis = this.options.sourceUpAxis || 'y-up';
        skeleton.sourceUnit = this.options.sourceUnit || 'centimeters';

        let index = 0;

        while (index < lines.length && !lines[index].trim().toUpperCase().startsWith('HIERARCHY')) {
            index++;
        }

        if (index >= lines.length) {
            throw new Error('HIERARCHY section not found');
        }

        index = this._parseHierarchy(lines, index, skeleton);
        index = this._parseMotion(lines, index, skeleton);

        return skeleton;
    }

    _splitLines(text) {
        return text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    }

    _tokenize(line) {
        return line.split(/\s+/).filter(token => token.length > 0);
    }

    _parseHierarchy(lines, startIndex, skeleton) {
        let index = startIndex;
        const tokens = this._tokenize(lines[index]);

        if (tokens[0].toUpperCase() !== 'HIERARCHY') {
            throw new Error('Expected HIERARCHY at line ' + index);
        }
        index++;

        const rootTokens = this._tokenize(lines[index]);
        if (rootTokens[0].toUpperCase() !== 'ROOT') {
            throw new Error('Expected ROOT at line ' + index);
        }

        const rootName = rootTokens.slice(1).join(' ') || 'Hips';
        skeleton.root = new BVHJoint(rootName);
        skeleton.joints.push(skeleton.root);
        skeleton.jointMap[rootName] = skeleton.root;
        index++;

        index = this._parseJointChildren(lines, index, skeleton.root, skeleton);

        return index;
    }

    _parseJointChildren(lines, startIndex, parentJoint, skeleton) {
        let index = startIndex;
        const tokens = this._tokenize(lines[index]);

        if (tokens[0] !== '{') {
            throw new Error('Expected { at line ' + index + ', got ' + tokens[0]);
        }
        index++;

        while (index < lines.length) {
            const line = lines[index];
            const tokens = this._tokenize(line);

            if (tokens[0] === '}') {
                index++;
                break;
            }

            if (tokens[0].toUpperCase() === 'OFFSET') {
                if (tokens.length < 4) {
                    throw new Error('Invalid OFFSET at line ' + index);
                }
                parentJoint.offset[0] = parseFloat(tokens[1]);
                parentJoint.offset[1] = parseFloat(tokens[2]);
                parentJoint.offset[2] = parseFloat(tokens[3]);
                index++;
            } else if (tokens[0].toUpperCase() === 'CHANNELS') {
                if (tokens.length < 2) {
                    throw new Error('Invalid CHANNELS at line ' + index);
                }
                const channelCount = parseInt(tokens[1]);
                parentJoint.channels = tokens.slice(2, 2 + channelCount);
                parentJoint.channelOrder = parentJoint.channels.map(ch => {
                    if (ch.includes('position')) return 'position';
                    if (ch.includes('rotation')) return 'rotation';
                    return ch;
                });
                index++;
            } else if (tokens[0].toUpperCase() === 'JOINT') {
                const jointName = tokens.slice(1).join(' ');
                const joint = new BVHJoint(jointName, parentJoint);
                parentJoint.addChild(joint);
                skeleton.joints.push(joint);
                skeleton.jointMap[jointName] = joint;
                index++;
                index = this._parseJointChildren(lines, index, joint, skeleton);
            } else if (tokens[0].toUpperCase() === 'END' && tokens[1]?.toUpperCase() === 'SITE') {
                parentJoint.isEndSite = true;
                index++;
                const endTokens = this._tokenize(lines[index]);
                if (endTokens[0] === '{') {
                    index++;
                    while (index < lines.length) {
                        const et = this._tokenize(lines[index]);
                        if (et[0] === '}') {
                            index++;
                            break;
                        }
                        if (et[0].toUpperCase() === 'OFFSET') {
                            parentJoint.endSiteOffset[0] = parseFloat(et[1]);
                            parentJoint.endSiteOffset[1] = parseFloat(et[2]);
                            parentJoint.endSiteOffset[2] = parseFloat(et[3]);
                        }
                        index++;
                    }
                }
            } else {
                index++;
            }
        }

        return index;
    }

    _parseMotion(lines, startIndex, skeleton) {
        let index = startIndex;

        while (index < lines.length && !lines[index].trim().toUpperCase().startsWith('MOTION')) {
            index++;
        }

        if (index >= lines.length) {
            throw new Error('MOTION section not found');
        }
        index++;

        while (index < lines.length) {
            const tokens = this._tokenize(lines[index]);
            if (tokens[0].toUpperCase() === 'FRAMES:') {
                skeleton.frameCount = parseInt(tokens[1]);
                index++;
            } else if (tokens[0].toUpperCase() === 'FRAME' && tokens[1]?.toUpperCase() === 'TIME:') {
                skeleton.frameTime = parseFloat(tokens[2]);
                index++;
            } else {
                break;
            }
        }

        const expectedChannels = skeleton.getChannelCount();
        skeleton.motionData = [];

        for (let f = 0; f < skeleton.frameCount && index < lines.length; f++, index++) {
            const tokens = this._tokenize(lines[index]);
            if (tokens.length < expectedChannels) {
                console.warn(`Frame ${f} has ${tokens.length} channels, expected ${expectedChannels}`);
            }

            const frameData = new Float32Array(expectedChannels);
            for (let i = 0; i < Math.min(tokens.length, expectedChannels); i++) {
                frameData[i] = parseFloat(tokens[i]);
            }
            skeleton.motionData.push(frameData);
        }

        return index;
    }
}

export class BVHConverter {
    constructor() {
        this.options = {
            targetUpAxis: 'z-up',
            targetUnit: 'meters',
            rotationOrder: 'ZXY',
            mappingType: 'motionBuilder',
            autoGuessMapping: true
        };
    }

    bvhToAnimationData(skeleton, options = {}) {
        Object.assign(this.options, options);

        const unitScale = CoordinateSystem.getUnitScale(
            skeleton.sourceUnit,
            this.options.targetUnit
        );

        let mapping = JointNameMapping[this.options.mappingType] || JointNameMapping.motionBuilder;
        const bvhJointNames = skeleton.joints.map(j => j.name);
        
        if (this.options.autoGuessMapping) {
            const guessed = guessJointMapping(bvhJointNames, CatSkeletonDefinition.joints);
            const combined = {};
            for (const name of bvhJointNames) {
                combined[name] = guessed[name] || mapJointName(name, mapping, 'fromExternal');
            }
            mapping = combined;
        }

        const inverseMapping = createInverseMapping(mapping);

        const result = {
            jointNames: CatSkeletonDefinition.joints.map(j => j.name),
            frameCount: skeleton.frameCount,
            frameRate: 1 / skeleton.frameTime,
            metadata: {
                source: 'BVH',
                sourceUpAxis: skeleton.sourceUpAxis,
                targetUpAxis: this.options.targetUpAxis,
                rotationOrder: skeleton.rotationOrder,
                frameCount: skeleton.frameCount,
                frameRate: 1 / skeleton.frameTime
            },
            frames: []
        };

        const boneLengths = this._calculateBoneLengths(skeleton, unitScale);

        for (let f = 0; f < skeleton.frameCount; f++) {
            const pose = new CatSkeletonPose();
            const frameData = skeleton.motionData[f];

            const worldPositions = {};
            const worldRotations = {};

            this._processJoint(skeleton.root, frameData, null, worldPositions, worldRotations, 
                             skeleton, unitScale, boneLengths);

            for (let i = 0; i < CatSkeletonDefinition.joints.length; i++) {
                const internalJoint = CatSkeletonDefinition.joints[i];
                const bvhJointName = inverseMapping[internalJoint.name] || internalJoint.name;
                
                if (worldPositions[bvhJointName]) {
                    const pos = vec3.create();
                    CoordinateSystem.convertPosition(pos, worldPositions[bvhJointName], 
                                                     skeleton.sourceUpAxis, 
                                                     this.options.targetUpAxis, 1);
                    pose.setPosition(i, pos);
                }

                if (worldRotations[bvhJointName]) {
                    const rot = quat.create();
                    CoordinateSystem.convertRotation(rot, worldRotations[bvhJointName],
                                                    skeleton.sourceUpAxis,
                                                    this.options.targetUpAxis);
                    pose.setRotation(i, rot);
                }
            }

            result.frames.push(pose);
        }

        return result;
    }

    _calculateBoneLengths(skeleton, unitScale) {
        const lengths = {};
        
        skeleton.traverse((joint, index, parentIndex) => {
            if (parentIndex >= 0) {
                const parent = skeleton.joints[parentIndex];
                const offset = vec3.create();
                CoordinateSystem.convertOffset(offset, joint.offset, 
                                              skeleton.sourceUpAxis, 
                                              this.options.targetUpAxis, unitScale);
                lengths[joint.name] = vec3.length(offset);
            }
        });

        return lengths;
    }

    _processJoint(joint, frameData, parentWorldPos, worldPositions, worldRotations,
                  skeleton, unitScale, boneLengths) {
        
        let channelOffset = 0;
        for (let i = 0; i < skeleton.joints.indexOf(joint); i++) {
            channelOffset += skeleton.joints[i].channels.length;
        }

        const localPos = vec3.create();
        const localRot = quat.create();
        quat.identity(localRot);

        let x = 0, y = 0, z = 0;
        let rx = 0, ry = 0, rz = 0;

        for (let i = 0; i < joint.channels.length; i++) {
            const channel = joint.channels[i];
            const value = frameData[channelOffset + i];

            switch (channel) {
                case 'Xposition': x = value; break;
                case 'Yposition': y = value; break;
                case 'Zposition': z = value; break;
                case 'Xrotation': rx = value * Math.PI / 180; break;
                case 'Yrotation': ry = value * Math.PI / 180; break;
                case 'Zrotation': rz = value * Math.PI / 180; break;
            }
        }

        quat.fromEulerWithOrder(localRot, rx, ry, rz, skeleton.rotationOrder);

        const convertedOffset = vec3.create();
        CoordinateSystem.convertOffset(convertedOffset, joint.offset,
                                      'y-up', 'y-up', unitScale);

        localPos[0] = x * unitScale + convertedOffset[0];
        localPos[1] = y * unitScale + convertedOffset[1];
        localPos[2] = z * unitScale + convertedOffset[2];

        const worldPos = vec3.create();
        const worldRot = quat.create();

        if (parentWorldPos) {
            const parentRot = worldRotations[joint.parent.name];
            if (parentRot) {
                const rotatedPos = vec3.create();
                vec3.transformMat4(rotatedPos, localPos, this._quatToMat4(parentRot));
                vec3.add(worldPos, parentWorldPos, rotatedPos);
                quat.multiply(worldRot, parentRot, localRot);
            } else {
                vec3.copy(worldPos, localPos);
                quat.copy(worldRot, localRot);
            }
        } else {
            vec3.copy(worldPos, localPos);
            quat.copy(worldRot, localRot);
        }

        quat.normalize(worldRot, worldRot);

        worldPositions[joint.name] = worldPos;
        worldRotations[joint.name] = worldRot;

        for (const child of joint.children) {
            this._processJoint(child, frameData, worldPos, worldPositions, worldRotations,
                              skeleton, unitScale, boneLengths);
        }
    }

    _quatToMat4(q) {
        const m = new Float32Array(16);
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, yx = y * x2, yy = y * y2;
        const zx = z * x2, zy = z * y2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        m[0] = 1 - yy - zz; m[1] = yx + wz; m[2] = zx - wy; m[3] = 0;
        m[4] = yx - wz; m[5] = 1 - xx - zz; m[6] = zy + wx; m[7] = 0;
        m[8] = zx + wy; m[9] = zy - wx; m[10] = 1 - xx - yy; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return m;
    }

    animationDataToBVH(animationData, options = {}) {
        const opts = Object.assign({
            targetUpAxis: 'y-up',
            targetUnit: 'centimeters',
            rotationOrder: 'ZXY',
            mappingType: 'motionBuilder',
            name: 'CatSkeleton'
        }, options);

        const mapping = JointNameMapping[opts.mappingType] || JointNameMapping.motionBuilder;
        const unitScale = CoordinateSystem.getUnitScale('meters', opts.targetUnit);

        const bvhSkeleton = new BVHSkeleton();
        bvhSkeleton.sourceUpAxis = opts.targetUpAxis;
        bvhSkeleton.sourceUnit = opts.targetUnit;
        bvhSkeleton.rotationOrder = opts.rotationOrder;
        bvhSkeleton.frameCount = animationData.frameCount;
        bvhSkeleton.frameTime = 1 / animationData.frameRate;

        const jointMap = {};
        const rootJoint = new BVHJoint(mapping['root'] || 'Hips');
        rootJoint.channels = ['Xposition', 'Yposition', 'Zposition', 'Xrotation', 'Yrotation', 'Zrotation'];
        bvhSkeleton.root = rootJoint;
        bvhSkeleton.joints.push(rootJoint);
        jointMap['root'] = rootJoint;

        for (let i = 1; i < CatSkeletonDefinition.joints.length; i++) {
            const internalJoint = CatSkeletonDefinition.joints[i];
            const parentJoint = CatSkeletonDefinition.joints[internalJoint.parent];
            const bvhName = mapping[internalJoint.name] || internalJoint.name;
            const bvhParentName = mapping[parentJoint.name] || parentJoint.name;

            const joint = new BVHJoint(bvhName, jointMap[parentJoint.name]);
            joint.channels = ['Xrotation', 'Yrotation', 'Zrotation'];

            const offset = vec3.create();
            vec3.subtract(offset, internalJoint.defaultPos, parentJoint.defaultPos);
            CoordinateSystem.convertOffset(offset, offset, 'z-up', opts.targetUpAxis, unitScale);
            joint.offset[0] = offset[0];
            joint.offset[1] = offset[1];
            joint.offset[2] = offset[2];

            jointMap[parentJoint.name].addChild(joint);
            bvhSkeleton.joints.push(joint);
            jointMap[internalJoint.name] = joint;
        }

        for (let f = 0; f < animationData.frameCount; f++) {
            const frameData = new Float32Array(bvhSkeleton.getChannelCount());
            let offset = 0;

            for (let i = 0; i < CatSkeletonDefinition.joints.length; i++) {
                const internalJoint = CatSkeletonDefinition.joints[i];
                const pose = animationData.frames[f];
                const bvhJoint = jointMap[internalJoint.name];

                const pos = vec3.create();
                pose.getPosition(i, pos);
                
                const rot = quat.create();
                pose.getRotation(i, rot);

                const convertedPos = vec3.create();
                CoordinateSystem.convertPosition(convertedPos, pos, 'z-up', opts.targetUpAxis, unitScale);

                const convertedRot = quat.create();
                CoordinateSystem.convertRotation(convertedRot, rot, 'z-up', opts.targetUpAxis);

                const euler = vec3.create();
                quat.toEuler(euler, convertedRot, opts.rotationOrder);

                if (i === 0) {
                    frameData[offset++] = convertedPos[0];
                    frameData[offset++] = convertedPos[1];
                    frameData[offset++] = convertedPos[2];
                }

                frameData[offset++] = euler[0] * 180 / Math.PI;
                frameData[offset++] = euler[1] * 180 / Math.PI;
                frameData[offset++] = euler[2] * 180 / Math.PI;
            }

            bvhSkeleton.motionData.push(frameData);
        }

        return bvhSkeleton;
    }

    bvhToString(skeleton) {
        let lines = [];

        lines.push('HIERARCHY');
        this._jointToString(skeleton.root, 0, lines);

        lines.push('MOTION');
        lines.push(`Frames: ${skeleton.frameCount}`);
        lines.push(`Frame Time: ${skeleton.frameTime.toFixed(6)}`);

        for (const frameData of skeleton.motionData) {
            lines.push(frameData.map(v => v.toFixed(6)).join(' '));
        }

        return lines.join('\n');
    }

    _jointToString(joint, depth, lines) {
        const indent = '\t'.repeat(depth);

        if (joint.parent === null) {
            lines.push(`${indent}ROOT ${joint.name}`);
        } else {
            lines.push(`${indent}JOINT ${joint.name}`);
        }

        lines.push(`${indent}{`);
        lines.push(`${indent}\tOFFSET ${joint.offset[0].toFixed(6)} ${joint.offset[1].toFixed(6)} ${joint.offset[2].toFixed(6)}`);

        if (joint.channels.length > 0) {
            lines.push(`${indent}\tCHANNELS ${joint.channels.length} ${joint.channels.join(' ')}`);
        }

        for (const child of joint.children) {
            this._jointToString(child, depth + 1, lines);
        }

        if (joint.isEndSite) {
            lines.push(`${indent}\tEnd Site`);
            lines.push(`${indent}\t{`);
            lines.push(`${indent}\t\tOFFSET ${joint.endSiteOffset[0].toFixed(6)} ${joint.endSiteOffset[1].toFixed(6)} ${joint.endSiteOffset[2].toFixed(6)}`);
            lines.push(`${indent}\t}`);
        }

        lines.push(`${indent}}`);
    }
}

export class BVHLoader {
    constructor() {
        this.parser = new BVHParser();
        this.converter = new BVHConverter();
    }

    async loadFromURL(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        const text = await response.text();
        return this.loadFromString(text, options);
    }

    async loadFromFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = this.loadFromString(e.target.result, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    loadFromString(text, options = {}) {
        const skeleton = this.parser.parse(text, options);
        const animationData = this.converter.bvhToAnimationData(skeleton, options);
        return {
            bvhSkeleton: skeleton,
            animationData: animationData
        };
    }

    exportToBVH(animationData, options = {}) {
        const bvhSkeleton = this.converter.animationDataToBVH(animationData, options);
        return this.converter.bvhToString(bvhSkeleton);
    }
}
