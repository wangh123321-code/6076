import { vec3 } from '../math/vec3.js';
import { LimbType, CatSkeletonDefinition, JointColors } from './CatSkeleton.js';

export class TrajectoryRenderer {
    constructor(renderer, skeletonRenderer) {
        this.renderer = renderer;
        this.skeletonRenderer = skeletonRenderer;
        this.trajectories = new Map();
        this.maxTrailLength = 60;
        this.colorByLimb = true;
        this.enabled = true;
        
        this.trajectoryColors = {
            frontLeft: [0.2, 1.0, 0.4, 0.9],
            frontRight: [0.4, 0.8, 0.2, 0.9],
            backLeft: [0.3, 0.5, 1.0, 0.9],
            backRight: [0.2, 0.4, 0.8, 0.9],
            tail: [1.0, 0.7, 0.3, 0.9],
            head: [1.0, 0.5, 0.5, 0.9],
            root: [0.8, 0.8, 0.8, 0.9]
        };

        this.limbVisibility = {
            frontLegs: true,
            backLegs: true,
            tail: true,
            head: true
        };
    }

    setMaxTrailLength(length) {
        this.maxTrailLength = Math.max(10, Math.min(500, length));
    }

    setLimbVisibility(limb, visible) {
        this.limbVisibility[limb] = visible;
    }

    clearAllTrajectories() {
        this.trajectories.clear();
    }

    clearTrajectory(jointName) {
        this.trajectories.delete(jointName);
    }

    addSample(jointIndex, position) {
        const jointName = CatSkeletonDefinition.getJointName(jointIndex);
        if (!this.trajectories.has(jointName)) {
            this.trajectories.set(jointName, []);
        }

        const trajectory = this.trajectories.get(jointName);
        trajectory.push([position[0], position[1], position[2]]);

        if (trajectory.length > this.maxTrailLength) {
            trajectory.shift();
        }
    }

    updateFromPose(pose) {
        if (!this.enabled) return;

        const limbJoints = [];

        if (this.limbVisibility.frontLegs) {
            limbJoints.push(...this.skeletonRenderer.getFrontLeftLegJoints());
            limbJoints.push(...this.skeletonRenderer.getFrontRightLegJoints());
        }

        if (this.limbVisibility.backLegs) {
            limbJoints.push(...this.skeletonRenderer.getBackLeftLegJoints());
            limbJoints.push(...this.skeletonRenderer.getBackRightLegJoints());
        }

        if (this.limbVisibility.tail) {
            limbJoints.push(...this.skeletonRenderer.getTailJoints());
        }

        if (this.limbVisibility.head) {
            limbJoints.push(...this.skeletonRenderer.getHeadJoints());
        }

        limbJoints.push(CatSkeletonDefinition.getJointIndex('root'));
        limbJoints.push(CatSkeletonDefinition.getJointIndex('spine3'));

        const uniqueJoints = [...new Set(limbJoints)];

        for (const jointIndex of uniqueJoints) {
            const pos = vec3.create();
            pose.getPosition(jointIndex, pos);
            this.addSample(jointIndex, pos);
        }
    }

    _getTrajectoryColor(jointIndex) {
        if (!this.colorByLimb) {
            return [1, 1, 1, 0.8];
        }

        const jointName = CatSkeletonDefinition.getJointName(jointIndex);
        const limb = CatSkeletonDefinition.getJointLimb(jointIndex);

        if (jointName.includes('front_left') || jointName.includes('left') && (jointName.includes('paw') || jointName.includes('shoulder') || jointName.includes('elbow') || jointName.includes('wrist'))) {
            return this.trajectoryColors.frontLeft;
        }
        if (jointName.includes('front_right') || jointName.includes('right') && (jointName.includes('paw') || jointName.includes('shoulder') || jointName.includes('elbow') || jointName.includes('wrist'))) {
            return this.trajectoryColors.frontRight;
        }
        if (jointName.includes('back_left') || jointName.includes('left') && (jointName.includes('foot') || jointName.includes('hip') || jointName.includes('knee') || jointName.includes('ankle'))) {
            return this.trajectoryColors.backLeft;
        }
        if (jointName.includes('back_right') || jointName.includes('right') && (jointName.includes('foot') || jointName.includes('hip') || jointName.includes('knee') || jointName.includes('ankle'))) {
            return this.trajectoryColors.backRight;
        }
        if (limb === LimbType.TAIL) {
            return this.trajectoryColors.tail;
        }
        if (limb === LimbType.HEAD) {
            return this.trajectoryColors.head;
        }

        return this.trajectoryColors.root;
    }

    _isLimbVisible(jointIndex) {
        const jointName = CatSkeletonDefinition.getJointName(jointIndex);
        const limb = CatSkeletonDefinition.getJointLimb(jointIndex);

        if (limb === LimbType.FRONT_LEG && !this.limbVisibility.frontLegs) {
            return false;
        }
        if (limb === LimbType.BACK_LEG && !this.limbVisibility.backLegs) {
            return false;
        }
        if (limb === LimbType.TAIL && !this.limbVisibility.tail) {
            return false;
        }
        if (limb === LimbType.HEAD && !this.limbVisibility.head) {
            return false;
        }

        return true;
    }

    render(options = {}) {
        if (!this.enabled) return;

        const showPoints = options.showPoints !== false;
        const lineWidth = options.lineWidth || 2;
        const fadeTrail = options.fadeTrail !== false;

        const limbJoints = [];

        if (this.limbVisibility.frontLegs) {
            limbJoints.push(...this.skeletonRenderer.getFrontLeftLegJoints());
            limbJoints.push(...this.skeletonRenderer.getFrontRightLegJoints());
        }

        if (this.limbVisibility.backLegs) {
            limbJoints.push(...this.skeletonRenderer.getBackLeftLegJoints());
            limbJoints.push(...this.skeletonRenderer.getBackRightLegJoints());
        }

        if (this.limbVisibility.tail) {
            limbJoints.push(...this.skeletonRenderer.getTailJoints());
        }

        if (this.limbVisibility.head) {
            limbJoints.push(...this.skeletonRenderer.getHeadJoints());
        }

        limbJoints.push(CatSkeletonDefinition.getJointIndex('root'));
        limbJoints.push(CatSkeletonDefinition.getJointIndex('spine3'));

        const uniqueJoints = [...new Set(limbJoints)];

        for (const jointIndex of uniqueJoints) {
            const jointName = CatSkeletonDefinition.getJointName(jointIndex);
            const trajectory = this.trajectories.get(jointName);

            if (!trajectory || trajectory.length < 2) continue;
            if (!this._isLimbVisible(jointIndex)) continue;

            const baseColor = this._getTrajectoryColor(jointIndex);

            const positions = [];
            const colors = [];

            for (let i = 0; i < trajectory.length; i++) {
                const point = trajectory[i];
                positions.push([point[0], point[1], point[2]]);

                let alpha = baseColor[3];
                if (fadeTrail) {
                    const t = i / (trajectory.length - 1);
                    alpha = 0.1 + t * t * (baseColor[3] - 0.1);
                }

                colors.push([baseColor[0], baseColor[1], baseColor[2], alpha]);
            }

            this.renderer.drawLines(positions, colors, lineWidth);

            if (showPoints && trajectory.length > 0) {
                const pointPositions = [];
                const pointColors = [];
                const pointSizes = [];

                for (let i = 0; i < trajectory.length; i += Math.max(1, Math.floor(trajectory.length / 20))) {
                    const point = trajectory[i];
                    pointPositions.push([point[0], point[1], point[2]]);
                    
                    const t = i / (trajectory.length - 1);
                    const alpha = 0.3 + t * t * 0.5;
                    pointColors.push([baseColor[0], baseColor[1], baseColor[2], alpha]);
                    pointSizes.push(2 + t * 4);
                }

                this.renderer.drawPoints(pointPositions, pointColors, pointSizes);
            }

            if (trajectory.length > 0) {
                const lastPoint = trajectory[trajectory.length - 1];
                const markerColor = [...baseColor];
                markerColor[3] = 1;
                this.renderer.drawSphere(
                    [lastPoint[0], lastPoint[1], lastPoint[2]],
                    0.04,
                    markerColor,
                    { ambient: 0.5 }
                );
            }
        }
    }

    getJointTrajectory(jointName) {
        return this.trajectories.get(jointName) || [];
    }

    getTrajectoryLength(jointName) {
        const trajectory = this.getJointTrajectory(jointName);
        if (trajectory.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < trajectory.length; i++) {
            const dx = trajectory[i][0] - trajectory[i - 1][0];
            const dy = trajectory[i][1] - trajectory[i - 1][1];
            const dz = trajectory[i][2] - trajectory[i - 1][2];
            length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        return length;
    }

    getTrajectoryBounds(jointName) {
        const trajectory = this.getJointTrajectory(jointName);
        if (trajectory.length === 0) return null;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const point of trajectory) {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            minZ = Math.min(minZ, point[2]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
            maxZ = Math.max(maxZ, point[2]);
        }

        return {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ]
        };
    }
}
