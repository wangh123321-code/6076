import { vec3 } from '../math/vec3.js';
import { quat } from '../math/quat.js';
import { CatSkeletonDefinition, CatSkeletonPose } from '../animation/CatSkeleton.js';

export class CSVParser {
    constructor() {
        this.jointNames = [];
        this.hasHeader = true;
        this.frameRate = 60;
        this.metadata = {};
    }

    parse(text, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const lines = this._splitLines(text);
                if (lines.length === 0) {
                    reject(new Error('Empty CSV file'));
                    return;
                }

                let headerLineIndex = 0;
                let metadataEndIndex = 0;

                for (let i = 0; i < Math.min(10, lines.length); i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('#') || line.startsWith('@') || line.includes('metadata')) {
                        this._parseMetadataLine(line);
                        metadataEndIndex = i + 1;
                        headerLineIndex = i + 1;
                    } else if (line.includes('frame') || line.includes('Frame') || line.toLowerCase().includes('time')) {
                        headerLineIndex = i;
                        break;
                    }
                }

                const headerLine = lines[headerLineIndex];
                const headers = this._parseLine(headerLine);
                
                this.jointNames = this._extractJointNames(headers);

                const dataLines = lines.slice(headerLineIndex + 1).filter(line => line.trim().length > 0);
                
                const result = {
                    jointNames: this.jointNames,
                    frameCount: dataLines.length,
                    frameRate: this.frameRate,
                    metadata: this.metadata,
                    frames: []
                };

                this._parseDataAsync(dataLines, headers, result, options)
                    .then(resolve)
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    _splitLines(text) {
        return text.split(/\r?\n/);
    }

    _parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if ((char === ',' || char === '\t') && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    _parseMetadataLine(line) {
        if (line.startsWith('#') || line.startsWith('@')) {
            line = line.substring(1);
        }
        
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim().toLowerCase();
            const value = parts.slice(1).join(':').trim();
            
            if (key === 'fps' || key === 'framerate' || key === 'frame_rate') {
                this.frameRate = parseFloat(value) || 60;
            }
            
            this.metadata[key] = value;
        }
    }

    _extractJointNames(headers) {
        const jointSet = new Set();
        const positionPattern = /^(.*?)(?:_pos|_position|_loc|_location)?[._]?(x|y|z)$/i;
        const rotationPattern = /^(.*?)(?:_rot|_rotation|_quat|_orientation)?[._]?(x|y|z|w)$/i;

        for (let i = 1; i < headers.length; i++) {
            const header = headers[i].trim();
            let match = header.match(positionPattern);
            if (match) {
                jointSet.add(match[1]);
                continue;
            }
            match = header.match(rotationPattern);
            if (match) {
                jointSet.add(match[1]);
            }
        }

        if (jointSet.size === 0) {
            for (let i = 1; i < headers.length; i += 3) {
                jointSet.add(`joint_${Math.floor(i / 3)}`);
            }
        }

        return Array.from(jointSet);
    }

    async _parseDataAsync(lines, headers, result, options) {
        const batchSize = options.batchSize || 1000;
        const usePositionOnly = options.usePositionOnly !== false;
        
        const headerToIndex = {};
        headers.forEach((h, i) => headerToIndex[h.trim().toLowerCase()] = i);

        for (let i = 0; i < lines.length; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, lines.length);
            
            for (let j = i; j < batchEnd; j++) {
                const values = this._parseLine(lines[j]);
                const pose = this._parseFrame(values, headers, headerToIndex, usePositionOnly);
                result.frames.push(pose);
            }

            if (options.onProgress) {
                options.onProgress(batchEnd, lines.length);
            }

            await this._yield();
        }

        return result;
    }

    _parseFrame(values, headers, headerToIndex, usePositionOnly) {
        const pose = new CatSkeletonPose();
        const jointCount = pose.getJointCount();

        if (this.jointNames.length === 0) {
            return pose;
        }

        const skeletonJoints = CatSkeletonDefinition.joints;

        for (let dataJointIdx = 0; dataJointIdx < this.jointNames.length; dataJointIdx++) {
            const dataJointName = this.jointNames[dataJointIdx].toLowerCase();
            
            let skeletonIdx = -1;
            for (let s = 0; s < skeletonJoints.length; s++) {
                const skelJointName = skeletonJoints[s].name.toLowerCase();
                if (skelJointName === dataJointName || 
                    dataJointName.includes(skelJointName) || 
                    skelJointName.includes(dataJointName)) {
                    skeletonIdx = s;
                    break;
                }
            }

            if (skeletonIdx === -1) {
                if (dataJointIdx < jointCount) {
                    skeletonIdx = dataJointIdx;
                } else {
                    continue;
                }
            }

            const pos = vec3.create();
            let posFound = false;

            for (const axis of ['x', 'y', 'z']) {
                const possibleHeaders = [
                    `${this.jointNames[dataJointIdx]}_${axis}`,
                    `${this.jointNames[dataJointIdx]}_pos_${axis}`,
                    `${this.jointNames[dataJointIdx]}_position_${axis}`,
                    `${this.jointNames[dataJointIdx]}.${axis}`,
                    `${this.jointNames[dataJointIdx]}_loc_${axis}`,
                    `${this.jointNames[dataJointIdx]}${axis.toUpperCase()}`
                ];

                for (const header of possibleHeaders) {
                    const lowerHeader = header.toLowerCase();
                    if (headerToIndex[lowerHeader] !== undefined) {
                        const idx = headerToIndex[lowerHeader];
                        if (idx < values.length) {
                            const val = parseFloat(values[idx]);
                            if (!isNaN(val)) {
                                if (axis === 'x') pos[0] = val;
                                else if (axis === 'y') pos[1] = val;
                                else if (axis === 'z') pos[2] = val;
                                posFound = true;
                            }
                            break;
                        }
                    }
                }
            }

            const offset = dataJointIdx * 3 + 1;
            if (!posFound && offset + 2 < values.length) {
                pos[0] = parseFloat(values[offset]) || 0;
                pos[1] = parseFloat(values[offset + 1]) || 0;
                pos[2] = parseFloat(values[offset + 2]) || 0;
                posFound = true;
            }

            if (posFound) {
                pose.setPosition(skeletonIdx, pos);
            }

            if (!usePositionOnly) {
                const rot = quat.create();
                let rotFound = false;

                for (const axis of ['x', 'y', 'z', 'w']) {
                    const possibleHeaders = [
                        `${this.jointNames[dataJointIdx]}_rot_${axis}`,
                        `${this.jointNames[dataJointIdx]}_quat_${axis}`,
                        `${this.jointNames[dataJointIdx]}_q${axis}`,
                        `${this.jointNames[dataJointIdx]}.${axis}`
                    ];

                    for (const header of possibleHeaders) {
                        const lowerHeader = header.toLowerCase();
                        if (headerToIndex[lowerHeader] !== undefined) {
                            const idx = headerToIndex[lowerHeader];
                            if (idx < values.length) {
                                const val = parseFloat(values[idx]);
                                if (!isNaN(val)) {
                                    if (axis === 'x') rot[0] = val;
                                    else if (axis === 'y') rot[1] = val;
                                    else if (axis === 'z') rot[2] = val;
                                    else if (axis === 'w') rot[3] = val;
                                    rotFound = true;
                                }
                                break;
                            }
                        }
                    }
                }

                if (rotFound) {
                    quat.normalize(rot, rot);
                    pose.setRotation(skeletonIdx, rot);
                }
            }
        }

        return pose;
    }

    _yield() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    parseSync(text, options = {}) {
        const lines = this._splitLines(text);
        if (lines.length === 0) {
            throw new Error('Empty CSV file');
        }

        let headerLineIndex = 0;
        
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('@')) {
                this._parseMetadataLine(line);
                headerLineIndex = i + 1;
            } else if (line.includes('frame') || line.includes('Frame') || line.toLowerCase().includes('time')) {
                headerLineIndex = i;
                break;
            }
        }

        const headerLine = lines[headerLineIndex];
        const headers = this._parseLine(headerLine);
        this.jointNames = this._extractJointNames(headers);

        const dataLines = lines.slice(headerLineIndex + 1).filter(line => line.trim().length > 0);
        const headerToIndex = {};
        headers.forEach((h, i) => headerToIndex[h.trim().toLowerCase()] = i);

        const result = {
            jointNames: this.jointNames,
            frameCount: dataLines.length,
            frameRate: this.frameRate,
            metadata: this.metadata,
            frames: []
        };

        const usePositionOnly = options.usePositionOnly !== false;

        for (let i = 0; i < dataLines.length; i++) {
            const values = this._parseLine(dataLines[i]);
            const pose = this._parseFrame(values, headers, headerToIndex, usePositionOnly);
            result.frames.push(pose);
        }

        return result;
    }
}

export class CSVLoader {
    constructor() {
        this.parser = new CSVParser();
    }

    async loadFromURL(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength) : null;

        if (options.streaming && total && total > 10 * 1024 * 1024) {
            return this._loadStreaming(response, options);
        }

        const text = await response.text();
        return this.parser.parse(text, options);
    }

    async _loadStreaming(response, options) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let firstChunk = true;
        let result = null;
        let headers = null;
        let headerToIndex = null;
        let lineCount = 0;
        let headerLineIndex = 0;
        let inMetadata = true;
        let frames = [];

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: !done });
            
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            if (firstChunk) {
                firstChunk = false;
                
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('#') || line.startsWith('@')) {
                        this.parser._parseMetadataLine(line);
                        headerLineIndex = i + 1;
                    } else if (line.includes('frame') || line.toLowerCase().includes('time')) {
                        headerLineIndex = i;
                        inMetadata = false;
                        break;
                    }
                }

                const headerLine = lines[headerLineIndex];
                headers = this.parser._parseLine(headerLine);
                this.parser.jointNames = this.parser._extractJointNames(headers);
                headerToIndex = {};
                headers.forEach((h, i) => headerToIndex[h.trim().toLowerCase()] = i);

                lines = lines.slice(headerLineIndex + 1);
                
                result = {
                    jointNames: this.parser.jointNames,
                    frameCount: 0,
                    frameRate: this.parser.frameRate,
                    metadata: this.parser.metadata,
                    frames: frames
                };
            }

            for (const line of lines) {
                if (!line.trim()) continue;
                const values = this.parser._parseLine(line);
                const pose = this.parser._parseFrame(values, headers, headerToIndex, options.usePositionOnly !== false);
                frames.push(pose);
                lineCount++;
            }

            if (options.onProgress) {
                options.onProgress(lineCount, null);
            }

            await this.parser._yield();
        }

        result.frameCount = frames.length;
        return result;
    }

    async loadFromFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onprogress = (e) => {
                if (options.onProgress && e.lengthComputable) {
                    options.onProgress(e.loaded, e.total);
                }
            };

            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    const result = await this.parser.parse(text, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            
            if (file.size > 50 * 1024 * 1024) {
                reader.readAsText(file);
            } else {
                reader.readAsText(file);
            }
        });
    }

    loadFromFileSync(file, options = {}) {
        const content = file.content || file;
        return this.parser.parseSync(content, options);
    }
}
