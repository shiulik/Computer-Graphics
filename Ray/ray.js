/////////////////////////////////////////

// Variables
var gl;
var canvas;

var aPositionLocation;

var aLightLocation;
// Buffer for sphere
var spBuf;

var light = [-30, 30, 60];
var bounce = 1;
var m = 4;

const vertexShaderCode = `#version 300 es
in vec3 aPosition;

void main() {
    gl_Position =  vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;

uniform vec3 uLightPosition;
uniform int um;
uniform int uBounce;

out vec4 fragColor;
void setupSphere(out vec3 position, out float radius, out vec3 color, out float shininess, vec3 pos, float rad, vec3 col, float shine) {
    position = pos;
    radius = rad;
    color = col;
    shininess = shine;
}
float calculateIntersection(vec3 rayOrigin, vec3 rayDir, vec3 spherePos, float sphereRadius) {
    vec3 oc = rayOrigin - spherePos;
    float a = dot(rayDir, rayDir);
    float halfB = dot(oc, rayDir);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = halfB * halfB - a * c;
    if (discriminant < 0.0) return -1.0;
    float sqrtDiscriminant = sqrt(discriminant);
    float t1 = (-halfB - sqrtDiscriminant) / a;
    float t2 = (-halfB + sqrtDiscriminant) / a;
    return (t1 > 0.0) ? t1 : t2;
}

// Phong shading function
vec3 phongShading(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 color, float shininess) {
    // Calculate reflection direction
    vec3 reflectionVector = normalize(-reflect(lightDir, normal));
    // Compute ambient, diffuse, and specular components
    float ambientStrength = 0.30;
    vec3 ambient = ambientStrength * color;
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 diffuseColor = color * diffuse;
    float specular = pow(max(dot(reflectionVector, viewDir), 0.0), shininess);
    float specularStrength = 0.15;
    vec3 specularColor = specularStrength * specular * vec3(10); // Specular color is white
    return ambient + diffuseColor + specularColor;
}
bool checkShadow(vec3 point, vec3 lightDir, vec3 spherePositions[7], float sphereRadii[7], int excludeIndex) {
    for (int i = 0; i < 7; i++) {
        if (i == excludeIndex) continue;
        float t = calculateIntersection(point, lightDir, spherePositions[i], sphereRadii[i]);
        if (t > 0.0) return true;
    }
    return false;
}
void initializeSpheres(out vec3 positions[7], out float radii[7], out vec3 colors[7], out float shininess[7]) {
    setupSphere(positions[0], radii[0], colors[0], shininess[0], vec3(-0.09, 0.77, -0.34), 0.26, vec3(0.063, 0.322, 0.953), 20.0); // Medium Blue
    setupSphere(positions[1], radii[1], colors[1], shininess[1], vec3(-0.45, 0.60, -0.47), 0.27, vec3(0.337, 0.196, 0.655), 18.0); // Purple
    setupSphere(positions[2], radii[2], colors[2], shininess[2], vec3(-0.35, 0.27, -0.9), 0.32, vec3(0.584, 0.196, 0.588), 22.0); // Magenta
    setupSphere(positions[3], radii[3], colors[3], shininess[3], vec3(0.24, 0.5, 0.06), 0.19, vec3(0.059, 0.365, 0.696), 22.0);  // Teal Blue
    setupSphere(positions[4], radii[4], colors[4], shininess[4], vec3(0.35, 0.13, 0.15), 0.18, vec3(0.063, 0.533, 0.541), 22.0);   // Cyan
    setupSphere(positions[5], radii[5], colors[5], shininess[5], vec3(0.2, -0.18, 0.02), 0.23, vec3(0.0, 0.5, 0.3), 22.0);       // Dark Green
    setupSphere(positions[6], radii[6], colors[6], shininess[6], vec3(-0.15, -0.25, 0.15), 0.20, vec3(0.055, 0.741, 0.059), 22.0); // Bright Green
}
int findClosestSphere(vec3 rayOrigin, vec3 rayDir, vec3 positions[7], float radii[7], out float closestT) {
    closestT = 1e6;
    int closestIndex = -1;
    for (int i = 0; i < 7; i++) {
        float t = calculateIntersection(rayOrigin, rayDir, positions[i], radii[i]);
        if (t > 0.0 && t < closestT) {
            closestT = t;
            closestIndex = i;
        }
    }
    return closestIndex;
}
vec3 calculateBounce(vec3 rayOrigin, vec3 rayDir, vec3 cameraPos, vec3 positions[7], float radii[7], vec3 colors[7], float shininess[7], int uBounce, int um) {
    vec3 reflectedColor = vec3(0.0);

    for (int bounce = 0; bounce <= uBounce; bounce++) {
        float closestT;
        int closestSphereIndex = findClosestSphere(rayOrigin, rayDir, positions, radii, closestT);
        if (closestSphereIndex == -1) break;
        vec3 intersectionPoint = rayOrigin + closestT * rayDir;
        vec3 normal = normalize(intersectionPoint - positions[closestSphereIndex]);
        vec3 lightDir = normalize(uLightPosition - intersectionPoint);
        vec3 viewDir = normalize(cameraPos - intersectionPoint);
        vec3 reflectionDir = reflect(rayDir, normal);
        reflectedColor += phongShading(normal, lightDir, viewDir, colors[closestSphereIndex], shininess[closestSphereIndex]);
        if ((um == 2 || um == 4) && checkShadow(intersectionPoint, lightDir, positions, radii, closestSphereIndex) && bounce == 0) {
            reflectedColor = vec3(0.05);
            break;
        }
        if (um == 3 || um == 4) {
            rayOrigin = intersectionPoint + 0.001 * normal;
            rayDir = reflectionDir;
        }
    }
    
    return reflectedColor;
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(600.0, 600.0);
    vec3 cameraPos = vec3(0.0, 0.0, 1.0);
    vec3 rayDir = normalize(vec3(uv * 2.0 - 1.0, -1.0));
    vec3 positions[7];
    float radii[7];
    vec3 colors[7];
    float shininess[7];
    initializeSpheres(positions, radii, colors, shininess);
    vec3 reflectedColor = calculateBounce(cameraPos, rayDir, cameraPos, positions, radii, colors, shininess, uBounce, um);
    fragColor = vec4(reflectedColor, 1.0);
}
`;


function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
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
    // Error check whether the shader is compiled correctly
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
  
    // check for compiiion and linking status
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

function webGLStart() {
    canvas = document.getElementById("ray");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aLightLocation = gl.getUniformLocation(shaderProgram, "uLightPosition");
    am = gl.getUniformLocation(shaderProgram, "um");
    aBounce = gl.getUniformLocation(shaderProgram, "uBounce");

    gl.enableVertexAttribArray(aPositionLocation);
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    var vertices = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(am, m);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(am, m);
}

function updateScene(action, value = null) {
    if (action === "mode") {
        if (value === "Phong") m = 1;
        else if (value === "Phong+Shadow") m = 2;
        else if (value === "Phong+Reflection") m = 3;
        else if (value === "Phong+Shadow+Reflection") m = 4; 
        else  m = 4; 
     }
     else if (action === "light") {
        document.getElementById('light-loc').innerHTML = value;
        light[0] = parseFloat(value);
    }
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(am, m);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(am, m);
}

