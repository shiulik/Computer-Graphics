////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes.


var gl;
var color;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;
var animation;

// for back and forth motion of the boat
let bigBoatX = 0.0;
let smallBoatX = 0.0;

const boatSpeed = 0.003;  // same speed for both
const bigBoatRange = 0.7;  // smaller range for bigger boat
const smallBoatRange = 0.9;  // wider range for smaller boat

let bigBoatDir = -1;
let smallBoatDir = -1;

// for rotation of the windmill and moon
let moonAngle = 0.0;
let moonSpeed = 0.01;

let fanAngle = 0.0;
let fanSpeed = 0.03;

// for drawing the circle
const numSegments = 50; // Number of segments for the circle
const angleIncrement = (Math.PI * 2) / numSegments;

var mode = 's';  // mode for drawing

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
    gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
    gl_PointSize = 5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 color;

void main() {
    fragColor = color;
}`;

function pushMatrix(stack, m) {
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    shaderProgram = gl.createProgram();
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);

    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);

    // check for compilation and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }

    //finally use the program.
    gl.useProgram(shaderProgram);

    return shaderProgram;
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2"); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

// drawing a square
function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
        0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(aPositionLocation, sqVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.uniform4fv(uColorLoc, color);

    // now draw the square
    // show the solid view
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the wireframe view
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the point view
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }    
}

// drawing a triangle
function initTriangleBuffer() {
    // buffer for point locations
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // buffer for point indices
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(aPositionLocation, triangleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the triangle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// drawing a circle
function initCircleBuffer() {
    // buffer for point locations
    const positions = [0, 0]; // take the center of the circle
    
    for (let i = 0; i < numSegments; i++) {
      const angle = angleIncrement * i;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }

    const circleVertices = new Float32Array(positions);
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = numSegments + 1;

    // Create index buffer
    const indices = [0, 1, numSegments];
    for (let i = 0; i < numSegments; i++) {
      indices.push(0, i, i + 1);
    }

    // buffer for point indices
    const circleIndices = new Uint16Array(indices);
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = indices.length;
}

function drawCircle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(aPositionLocation, circleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the rays of the moon
function initRayBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // taking only 8 segments
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2) * i / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const rayVertices = new Float32Array(positions);
    rayBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rayVertices, gl.STATIC_DRAW);
    rayBuf.itemSize = 2;
    rayBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 0; i < 8; i++) {
      indices.push(0, i+1);
    }

    // buffer for point indices
    const rayIndices = new Uint16Array(indices);
    rayIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rayIndices, gl.STATIC_DRAW);
    rayIndexBuf.itemsize = 1;
    rayIndexBuf.numItems = indices.length;
}

function drawRays(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.vertexAttribPointer(aPositionLocation, rayBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the rays
    if (mode === 'p') {
        gl.drawElements(gl.POINTS, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // the rays are lines even in "solid" view
    else {
        gl.drawElements(gl.LINE_STRIP, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the blades of the windmill (easier to rotate)
function initFanBladesBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // based on manual calculations
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2) * i / 16;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const bladeVertices = new Float32Array(positions);
    bladeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bladeVertices, gl.STATIC_DRAW);
    bladeBuf.itemSize = 2;
    bladeBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 1; i < 16; i=i+4) {
      indices.push(0, i, i+1);
    }

    // buffer for point indices
    const bladeIndices = new Uint16Array(indices);
    bladeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bladeIndices, gl.STATIC_DRAW);
    bladeIndexBuf.itemsize = 1;
    bladeIndexBuf.numItems = indices.length;
}

function drawFanBlades(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.vertexAttribPointer(aPositionLocation, bladeBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the blade
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLE_FAN, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// Draw the Night Sky

function drawSky() {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the moon with 8 rays
// The rotation angle is taken as input for animation
function drawMoon(moonAngle) {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [1, 1, 1, 1];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    mMatrix = mat4.scale(mMatrix, [0.12, 0.12, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Rays of the moon
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 1.0]);
    mMatrix = mat4.rotate(mMatrix, moonAngle, [0, 0, 1]);
    drawRays(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}


// Draw the clouds

function drawCloud() {
    mat4.identity(mMatrix);
    // Left Cloud
    pushMatrix(matrixStack, mMatrix);
    color = [0.75, 0.75, 0.75, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.84, 0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.22, 0.12, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Middle Cloud
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Right Cloud
    pushMatrix(matrixStack, mMatrix);
    color = [0.75, 0.75, 0.75, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.45, 0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.11, 0.07, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the stars

function drawClusterOfStars(time) {
            
    const tr_t_x = 0.01;     
    const tr_t_y = 0.01;     
    const tr_s_x = 0.01;     
    const tr_s_y = 0.01;     
        
    const starConfig = [
    { x: -0.3, y: 0.73, size: 0.01 },  
    { x: -0.13, y: 0.63, size: 0.01 },  
    { x: -0.2,  y: 0.52, size: 0.006 },  
    { x: 0.32, y: 0.74, size: 0.015 },  
    { x: 0.54, y: 0.9, size: 0.008 }   
    ];

    starConfig.forEach((star, i) => {
        drawStar(
            star.x, star.y, star.size, 
            tr_t_x * (star.size / 0.01),
            tr_t_y * (star.size / 0.01), 
            tr_s_x * (star.size / 0.01),  
            tr_s_y * (star.size / 0.01),
            time + i * 0.5 
        );
    });
}

function drawStar(center_t_x, center_t_y, center_s, tr_t_x, tr_t_y, tr_s_x, tr_s_y, time) {
    
    mat4.identity(mMatrix);
    const twinkleIntensity = Math.sin(time * 1) * 0.5 + 0.5 ; 
    const s = 1.0 + 0.3 * Math.sin(time * 1);
    color = [1.0, 1.0, 1.0, twinkleIntensity]; 

    // Circle at the centre
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_t_x, center_t_y, 0]);
    mMatrix = mat4.scale(mMatrix, [center_s*0.6*s, center_s*0.6*s, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // 4 Triangles
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_t_x, center_t_y + 1.5*tr_t_y, 0]); 
    mMatrix = mat4.scale(mMatrix, [tr_s_x*s, tr_s_y*3*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_t_x, center_t_y - 1.5*tr_t_y, 0]); 
    mMatrix = mat4.rotate(mMatrix, Math.PI, [0, 0, 1]); 
    mMatrix = mat4.scale(mMatrix, [tr_s_x*s, tr_s_y*3*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_t_x - 1.5*tr_t_x, center_t_y, 0]); 
    mMatrix = mat4.rotate(mMatrix, Math.PI / 2, [0, 0, 1]); 
    mMatrix = mat4.scale(mMatrix, [tr_s_x*s, tr_s_y*3*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_t_x + 1.5*tr_t_x, center_t_y, 0]); 
    mMatrix = mat4.rotate(mMatrix, -Math.PI / 2, [0, 0, 1]); 
    mMatrix = mat4.scale(mMatrix, [tr_s_x*s, tr_s_y*3*s, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the mountains

function drawMountain(t_x1, t_y1, s_x, s_y, t_x2 = 0, t_y2 = 0, single = false) {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.5020, 0.3608, 0.2588, 1.0];
    if (single) color = [0.5843, 0.4667, 0.3176, 1.0];

    mMatrix = mat4.translate(mMatrix, [t_x1, t_y1, 0]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // As there is a single triangle in the mountain, we ignore the darker portion
    if (!single) {
        pushMatrix(matrixStack, mMatrix);
        color = [0.5843, 0.4667, 0.3176, 1.0];
        mMatrix = mat4.translate(mMatrix, [t_x2, t_y2, 0]);
        mMatrix = mat4.rotate(mMatrix, 6.46, [0, 0, 1]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
    }
}

// Draw the Green Ground

function drawGround() {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 1, 0.5, 0.97];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the lines on the river

function drawLines(move = false, x = 0, y = 0) {
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [x, y, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.5, 0.5, 0.5, 0.8];
    mMatrix = mat4.translate(mMatrix, [-0.67, -0.16, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.71, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.005, 0.38, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the River

function drawRiver() {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.041, 0.312, 0.859, 0.92];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 0.24, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    drawLines();
    drawLines(true, 0.66, 0.081);
    drawLines(true, 1.4, -0.08);
}

// Draw the Road

function drawRoad() {
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.39, 0.640, 0.196, 0.97];
    mMatrix = mat4.translate(mMatrix, [0.51, -0.82, 0]);
    mMatrix = mat4.rotate(mMatrix, 7.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.8, 1.9, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the Trees

function drawTrees(move = false, t_x = 0, t_y= 0, s_x = 0, s_y = 0) {
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation and scaling
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 0]);
    }

    // Stem of the Tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.525, 0.278, 0.241, 0.95];
    mMatrix = mat4.translate(mMatrix, [0.54, 0.158, 0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.34, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Lower Triangle of the tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.1137, 0.5569, 0.1451, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.54, 0.44, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Middle Triangle
    pushMatrix(matrixStack, mMatrix);
    color = [0.1843, 0.6863, 0.2039, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.54, 0.49, 0]);
    mMatrix = mat4.scale(mMatrix, [0.45, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Upper Triangle
    pushMatrix(matrixStack, mMatrix);
    color = [0.2627, 0.7843, 0.2745, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.54, 0.54, 0]);
    mMatrix = mat4.scale(mMatrix, [0.45, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    /*// Stem of the Tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.525, 0.278, 0.241, 0.95];
    mMatrix = mat4.translate(mMatrix, [0.54, 0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.35, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);*/
}

// DRaw the Boats

function updateBoats() {
    // Big boat movement
    bigBoatX += boatSpeed * bigBoatDir;
    if (Math.abs(bigBoatX) > bigBoatRange) {
        bigBoatDir *= -1;
    }

    // Small boat movement
    smallBoatX += boatSpeed * smallBoatDir;
    if (Math.abs(smallBoatX) > smallBoatRange) {
        smallBoatDir *= -1;
    }
}

function drawBigBoat(bigBoatX) {
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [bigBoatX, 0, 0]);

    //Base of the BigBoat
    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [0, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.06, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Upper Part of the BigBoat
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0, 0.006, 0]);
    mMatrix = mat4.scale(mMatrix, [0.01, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.06, -0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, 5.8, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.006, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [1, 0, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.106, 0.006, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawSmallBoat(smallBoatX) {
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [smallBoatX, 0, 0]);

    //Base of the SmallBoat
    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [0.014, -0.066, 0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.025, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.036, -0.066, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.025, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.064, -0.066, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.025, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Upper Part of the SmallBoat
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.018, 0.014, 0]);
    mMatrix = mat4.scale(mMatrix, [0.006, 0.13, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.007, 0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, 5.9, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.003, 0.13, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.541, 0, 0.786, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.07, 0.019, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the Windmill

function drawFan(fanAngle, move = false, t_x = 0, s = 1.0) {
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }

    // Base of the Windmill
    pushMatrix(matrixStack, mMatrix);
    color = [0.2, 0.2, 0.2, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.69, -0.21*s, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03*s, 0.55*s, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing the fan blades
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.75, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.69, 0.06, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2*s, 0.2*s, 1.0]);
    // rotating the fan blades
    mMatrix = mat4.rotate(mMatrix, -fanAngle, [0, 0, 1]);
    drawFanBlades(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.69, 0.053, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03*s, 0.03*s, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the Bushes

function drawBush(move=false, t_x=0, t_y=0, s=0) {
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s, s, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.6, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-1, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.058, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.27, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.72, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.06, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.45, 0, 0.9]
    mMatrix = mat4.translate(mMatrix, [-0.86, -0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.12, 0.08, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the Housh

function drawHouse() {
    mat4.identity(mMatrix);

    // Roof of the House
    pushMatrix(matrixStack, mMatrix);
    color = [1, 0.3, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.32, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.75, -0.32, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.32, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Base of the House
    pushMatrix(matrixStack, mMatrix);
    color = [1, 1, 1, 1];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.545, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Windows
    pushMatrix(matrixStack, mMatrix);
    color = [0.75, 0.6, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.49, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.4, -0.49, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Door of the House
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.58, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.18, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Draw the Car

// WHheels for the Car
function drawWheel(move = false, t_x = 0) {
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.63, -0.88, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.51, 0.51, 0.51, 1];
    mMatrix = mat4.translate(mMatrix, [-0.63, -0.88, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCar() {
    mat4.identity(mMatrix);

    pushMatrix(matrixStack, mMatrix);
    color = [0.043, 0.075, 0.669, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.47, -0.76, 0]);
    mMatrix = mat4.scale(mMatrix, [0.157, 0.1, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.85, 0.85, 0.85, 1];
    mMatrix = mat4.translate(mMatrix, [-0.47, -0.756, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.11, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


    // drawing wheels
    drawWheel(true, 0.05);
    drawWheel(true, 0.27);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.4, 1, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.47, -0.81, 0]);
    mMatrix = mat4.scale(mMatrix, [0.38, 0.1, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.28, -0.81, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.661, -0.81, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    function animate() {
        moonAngle += moonSpeed;
        fanAngle += fanSpeed;

        updateBoats();
        drawSky();
        drawMoon(moonAngle);
        drawCloud();

        const currentTime = performance.now() / 100; 
        drawClusterOfStars(currentTime);

        // draw the 3 mountains
        drawMountain(-0.58, 0.068, 1.4, 0.3, -0.555, 0.07);
        drawMountain(-0.0758, 0.067, 1.7, 0.5, -0.035, 0.07);
        drawMountain(0.8, 0.05, 1.0, 0.25, -0.545, -0.005, true);

        drawGround();
        drawRoad();
        drawRiver();

        // draw the trees
        drawTrees(true, 0.35, 0, 0.85, 0.85)
        drawTrees();
        drawTrees(true, -0.2, 0, 0.8, 0.8)

        // applying back and forth motion to the boat
        drawSmallBoat(smallBoatX);
        drawBigBoat(bigBoatX);
        
        // applying rotatory motion to the blades of the windmill
        drawFan(fanAngle,  true, -0.2,0.7);
        drawFan(fanAngle,true,0,1.1);
      
        // draw the bushes
        drawBush(true,-0.09,-0.12,0.9);
        drawBush(true, 0.7, -0.03, 1.02);
        drawBush(true, 1.48, -0.14, 1.7);
        drawBush(true, 2.119, 0.206, 1.26);

        drawHouse();
        drawCar();

        // Request the next animation frame
        animation = window.requestAnimationFrame(animate);
    }
    animate();
}

// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("scenery");
    initGL(canvas);
    shaderProgram = initShaders();
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    gl.enableVertexAttribArray(aPositionLocation);
    uColorLoc = gl.getUniformLocation(shaderProgram, "color");

    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer();
    initRayBuffer();
    initFanBladesBuffer();

    drawScene();
}

function changeView(m) {
    mode = m;
    drawScene();
}