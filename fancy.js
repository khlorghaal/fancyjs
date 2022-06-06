/* author khlorghaal
MIT License 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

Use by owners of Che Guevarra parafernalia is prohibited, where possible, 
and highly discouraged elsewhere.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

/* JS UTIL
      ###   #########       ###      ###   ##########   #########   ###  
      ###   #########       ###      ###   ##########   #########   ###  
      ###   ###             ###      ###       ###         ###      ###  
      ###   #########       ###      ###       ###         ###      ###  
      ###   #########       ###      ###       ###         ###      ###  
      ###         ###       ###      ###       ###         ###      ###  
#########   #########       ############       ###      #########   #########   
#########   #########       ############       ###      #########   ######### 
*/
function cout(m){console.log(m);};//i have no idea why but you cant alias these
function cerr(m){console.error(m);};

//Funpolice made everything in Math nonenumerable
var rand= Math.random;
var sign= Math.sign;
var sin= Math.sin;
var cos= Math.cos;
var abs= Math.abs;
var min= Math.min;
var max= Math.max;
var floor= Math.floor;
var ceil= Math.ceil;
var sqrt= Math.sqrt;
var pow= Math.pow;
var exp= Math.exp;
var log= Math.log;
var log2= Math.log2;
function mod(x,m){//js's % is remainder instread of modulus, which mangles negatives
	return x-floor(x/m)*m;
}
function fract(x){
	return x-floor(x);
}
function clamp(x, a,b){
	return max(a, min(b, x));
}
function clamp01(x){
	return max(0, min(1, x));
}
function smooth(x){
	return x*x*(3-2*x);
}
function len2(x,y){
	return sqrt(x*x+y*y);
}
function len3(x,y,z){
	return sqrt(x*x+y*y+z*z);
}
//1    *    ^^^^^^-------------
//      *  ^     -^         
//       *^     -  ^       
//       ^*   -     ^      
//      ^  * -       ^        
//0    ^----***********^*^*^
//     t0 ->
//1           ________
//^          /        \
//|         /          \
//ret _____/            \__
//    x->  a  b       c  d
function peak(a,b,c,d, x){
	var sab=  1/(b-a);
	var scd= -1/(d-c);

	//f(m) = 1 = s[ab|cd]*m + k[b|c]
	var kab= 1 - sab*b;
	var kcd= 1 - scd*c;

	var fab= x*sab + kab;//LACK OF VECTORS :C
	var fcd= x*scd + kcd;

	//f(b) = f(e) = 0
	fab= clamp01(fab);
	fcd= clamp01(fcd);

	return fab<fcd ? fab:fcd;
}
function rise(a,b,c){

}
function fall(a,b,c){

}


function Latch(finished){
	this.count= 0;
	this.finished= finished;
};
//getting an await will increment the counter,
//returns a callback for its consumer to call when finished
//
//This might be the most beautiful JS I've written.
//Yes its a function returning a function. Fight me.
Latch.prototype.await= function(){
	this.count++;
	return (function(){
		if(--this.count<1)
			this.finished();
	}).bind(this);
};


/* GL UTIL
###########   ###             ###      ###   ##########   #########   ###  
###########   ###             ###      ###   ##########   #########   ###  
###           ###             ###      ###       ###         ###      ###  
###           ###             ###      ###       ###         ###      ###  
###     ###   ###             ###      ###       ###         ###      ###  
###     ###   ###             ###      ###       ###         ###      ###  
###########   #########       ############       ###      #########   #########   
###########   #########       ############       ###      #########   #########   

This is the first I've made WGL Boilerplate in an organized and reusable fashion
I plan to reuse this for all my future Webgl projects.
I find it easier and far more versatile to make my own library than to learn one.

EXTENSION functions and constants have standard GL naming convention.
That is, regex _*(EXT|OES|WEBGL|ANGLE)_* is stripped from them.
And are loaded into the gl object.

*/

var gl;//single thread allows for safe state of a global

//Contexts may only be constructed after all header
function GLCanvas(canv, opts){
	this.canv= canv;

	try{
		if(!opts)
			opts={
				alpha: false,
				antialias: false,
			}
		this.gl=
		canv.getContext('webgl',opts) || 
		canv.getContext('experimental-webgl',opts);
		if(!this.gl)
			throw '>:C';
	}catch(e){
		alert('Use a less awful browser.');
		throw 'CANT INIT GL';
	}
	gl= this.gl;

	initGL();

	canv.onresize= (function(){ this.resized= true; }).bind(this);
	this.resize();

	gl.clearColor(0,0,1,0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}
//otherwise onreisze events may not match which ctx is bound to the global
GLCanvas.prototype.checkResized= function(){
	if(this.resized){
		this.resized= false;
		this.resize();
	}
}
GLCanvas.SS= 1;//supersample
GLCanvas.prototype.resize= function(){
	var c= this.canv;
	this.w= gl.w= c.width= c.clientWidth*GLCanvas.SS;
	this.h= gl.h= c.height= c.clientHeight*GLCanvas.SS;
	this.aspinv= this.h/this.w;
	gl.viewport(0,0,this.w,this.h);
	console.log('w:'+this.w+' h:'+this.h);
}

//anything needing initialized with a ref to the gl 
//pushes an init function to this
var INIT_QUEUE= [];

function glcheckerr(){
	var err= gl.getError();
	if(err!=0){
		cerr(err);
		throw err;
	}
}
/*
autogens vbo, vao

attribs[[ length,type,noramlized ],+]
offsets are autogenerated
data must be interleaved

programs must internally conform to binding locations,
in same order as attribs param
*/
function VBAO(primitiveType, data, attribs){
	if(!attribs instanceof Array)
		attribs= [attribs];

	var vao= this.vao= gl.createVertexArray();
	gl.bindVertexArray(vao);
	var loc= 0;
	var offs= 0;
	var stride= 0;
	for(var attrib of attribs){
		attrib.loc= loc++;
		gl.enableVertexAttribArray(attrib.loc);

		var len= attrib.len= attrib[0];
		var type=   attrib.type=   attrib[1];
		var normed= attrib.normed= attrib[2];
		if(!type)
			throw 'attrib type undefined';

		attrib.offs= stride;
		stride+= len*tsizes[type];
	}
	this.stride= stride;

	var vbo= this.vbo= gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER,  data, gl.STATIC_DRAW);
	for(var attrib of attribs)
		gl.vertexAttribPointer(
			attrib.loc,
			attrib.len,
			attrib.type,
			attrib.normed,
			stride,
			attrib.offs
		);

	this.primtyp= primitiveType;
	this.size= data.byteLength;
	this.count= this.size/this.stride;
	if(this.count%1!=0)
		throw '';
}
VBAO.prototype.bind= function(){
	gl.bindVertexArray(this.vao);
}
VBAO.prototype.draw= function(){
	gl.bindVertexArray(this.vao);
	gl.drawArrays(this.primtyp, 0, this.count);
};
var tsizes= {};
INIT_QUEUE.push(function(){
	tsizes[gl.BYTE]= 1;
	tsizes[gl.SHORT]= 2;
	tsizes[gl.INT]= 4;
	tsizes[gl.UNSIGNED_BYTE]= 1;
	tsizes[gl.UNSIGNED_SHORT]= 2;
	tsizes[gl.UNSIGNED_INT]= 4;
	tsizes[gl.FLOAT]= 4;
	//one of a few instances where I like javascript
});

//going functional is far easier than descending into
//a prototype spaghetti hell

function GLProg(vshsrc,fshsrc){
	var include= 
	`#version 100
	precision highp float;
	`;
	vshsrc= include+vshsrc;
	fshsrc= include+fshsrc;
	var ptr= this.ptr= gl.createProgram();
	var vsh= gl.createShader(gl.VERTEX_SHADER);
	var fsh= gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(vsh,vshsrc);
	gl.shaderSource(fsh,fshsrc);
	gl.compileShader(vsh);
	gl.compileShader(fsh);
	if(!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)){
		var il= gl.getShaderInfoLog(vsh);
		throw il;
	}
	if(!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)){
		var il= gl.getShaderInfoLog(fsh);
		throw il;
	}

	gl.attachShader(ptr,vsh);
	gl.attachShader(ptr,fsh);

	//assign offsets in order
	var attriblines= vshsrc.match(/attribute \S* \S*/g);
	var attribAcc= 0;
	if(!!attriblines)
		for(var attribline of attriblines){
			var name= attribline.match(/\s+\w+\s*;/)[0].match(/\w+/)[0];
			gl.bindAttribLocation(ptr, attribAcc++, name);
		}

	gl.linkProgram(ptr);
	if(!gl.getProgramParameter(ptr, gl.LINK_STATUS)){
		var il= gl.getProgramInfoLog(ptr);
		throw il;
	}
	
	gl.deleteShader(vsh);
	gl.deleteShader(fsh);

	GLProg.active= this;
}
GLProg.prototype.use= function(){
	gl.useProgram(this.ptr);
	GLProg.active= this;
}
GLProg.prototype.delete= function(){
	gl.deleteProgram(this.ptr);
}
function uloc(name){
	var ret= gl.getUniformLocation( GLProg.active.ptr, name );
	if(ret==-1)
		throw 'uniform not found';
	return ret;
}
function getUniform(name){
	return gl.getUniform( GLProg.active.ptr, uloc(name) )
}

//This ctor is private, use the maker functions
function Texture2D(){
	this.ptr= gl.createTexture();
	this.bind();
}
Texture2D.prototype.bind= function(){
	gl.bindTexture(gl.TEXTURE_2D, this.ptr);
}
Texture2D.prototype.delete= function(){
	gl.deleteTexture(this.ptr);
};
Texture2D.fromRaster= function(ifmt, w,h, rfmt,rtyp, raster){
	var ret= new Texture2D();
	this.w= w;
	this.h= h;
	gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w,h,0, rfmt,rtyp, raster);
	ret.setTexparams_nearest();
	return ret;
}
Texture2D.fromImage= function(img){
	var ret= new Texture2D();
	this.w= img.height;
	this.h= img.width;
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	ret.setTexparams_linear();
	return ret;
}
Texture2D.prototype.setTexparams_nearest= function(){
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
Texture2D.prototype.setTexparams_linear= function(){
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.generateMipmap(gl.TEXTURE_2D);
}
function image2Raster(image){
	var canv= document.createElement('canvas');
	canv.width= image.width;
	canv.height= image.height;
	var ctx= canv.getContext('2d');
	ctx.drawImage(image,0,0);
	return ctx.getImageData(0,0, image.width,image.height);
}
function canvas2raster(canvas){
	return ctx.getImageData(0,0, canvas.width,canvas.height);
}
Texture2D.renderprog= null;
INIT_QUEUE.push(function(){
	Texture2D.renderprog= new GLProg(`
attribute vec2 pos;
varying vec2 uv;
void main(){
	gl_Position= vec4( pos*2.-1. ,0.,1.);
	uv= pos;
}
`,`
uniform sampler2D tex0;

varying vec2 uv;
void main(){
	gl_FragColor= texture2D(tex0, uv);
}
`);
});
Texture2D.prototype.render= function(){
	gl.disable(gl.BLEND);
	Texture2D.renderprog.use();
	this.bind();
	var valid= gl.validateProgram(Texture2D.renderprog.ptr);
	//fullscreenQuad();
	glcheckerr();
}



function FBO(textures){
	var ptr= this.ptr= gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, ptr);

	var drawbufs= [];
	for(var i=0; i!=textures.length; i++){
		var db= gl.COLOR_ATTACHMENT0+i;
		drawbufs.push(db);
		var tex= textures[i].ptr;
		gl.framebufferTexture2D(gl.FRAMEBUFFER, db, gl.TEXTURE_2D, tex, 0);
	}
	gl.drawBuffers(drawbufs);
	
	this.w= textures[0].w;
	this.h= textures[0].h;

	var status= gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if(status!=gl.FRAMEBUFFER_COMPLETE)
		throw status;
}
FBO.prototype= {
	delete: function(){
		gl.deleteFramebuffer(this.ptr);
	},

	bind: function(){
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.ptr);
		gl.viewport(0,0,this.w,this.h);
	},
}
FBO.bindDefault= function(){
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0,0,gl.w,gl.h);
}


//ES doesnt support varying int

/* COMPUTE
########   ##########   ###     ###   #########   ###    ###  #########  ########
########   ##########   ####   ####   #########   ###    ###  #########  ########
###        ###    ###   ###########   ###    ##   ###    ###     ###     ###     
###        ###    ###   ### ### ###   #########   ###    ###     ###     ########
###        ###    ###   ###  #  ###   #########   ###    ###     ###     ########
###        ###    ###   ###     ###   ###         ###    ###     ###     ###     
###        ###    ###   ###     ###   ###         ###    ###     ###     ###     
########   ##########   ###     ###   ###         ##########     ###     ########
########   ##########   ###     ###   ###         ##########     ###     ########
*/
/* Abstracts the ghettoness of 2d texture compute.
 * Recommend size being a power of 2 because uv float16 precision
 * Can not exceed max texture resolution of 16
 *  256=     65,536
 *  512=    262,144
 * 1024=  1,048,576
 * 2048=  4,194,304
 * 4096= 16,777,216
 * p_init: initial positions
 * v_init: initial velocities, defaults to 0
 * kernel: function loded into vsh
 */
function KinematicCompute(p_init, v_init, kernel, renderprog){
	if(!p_init instanceof Array)
		throw 'aw shit';

	if(!v_init){
		v_init= new Array(p_init.length);
		v_init.fill(0);
	}
	else if(p_init.length!=v_init.length)
		throw 'length mismatch';

	var count= p_init.length/4;
	var w= ceil(sqrt(p_init.length/4));
	for(var i=p_init.length; i!=w*w*4; i++){//pad up to texture size, vbao count prevents overdraw
		p_init.push(0);
		v_init.push(0);
	}

	var p= new Float32Array(p_init);
	var v= new Float32Array(v_init);

	this.ptex= Texture2D.fromRaster(gl.RGBA, w,w, gl.RGBA,gl.FLOAT,p);
	this.ptex.setTexparams_nearest();
	this.ptex2= Texture2D.fromRaster(gl.RGBA, w,w, gl.RGBA,gl.FLOAT,p);
	this.ptex2.setTexparams_nearest();
	
	this.vtex= Texture2D.fromRaster(gl.RGBA, w,w, gl.RGBA,gl.FLOAT,v);
	this.vtex.setTexparams_nearest();
	this.vtex2= Texture2D.fromRaster(gl.RGBA, w,w, gl.RGBA,gl.FLOAT,v);
	this.vtex2.setTexparams_nearest();
	
	this.fbo=  new FBO([this.ptex2,this.vtex2]);
	this.fbo2= new FBO([this.ptex, this.vtex ]);

	var pre=  `
uniform ivec2 size;
uniform sampler2D p0_samp;
uniform sampler2D v0_samp;

void kernel(out vec3 p, out vec3 v, inout vec2 id){
	vec3 p0= texture2D(p0_samp,id).xyz;
	vec3 v0= texture2D(v0_samp,id).xyz;
	p= p0;
	v= v0;
	`;
	var post= `
}

attribute vec2 id_attr;
varying vec4 p;
varying vec4 v;
void main(){
	vec2 id= id_attr;
	kernel(p.xyz, v.xyz, id);
	p.w= 0.;
	v.w= 0.;
	gl_Position= vec4(id*2.-1.,0.,1.);
	gl_PointSize= 1.;
}
	`;
	var fsh= `
#extension GL_EXT_draw_buffers : require
precision highp float;
varying vec4 p;
varying vec4 v;
void main(){
	gl_FragData[0]= p;
	gl_FragData[1]= v;
}
	`;
	this.prog_iterate= new GLProg(pre+kernel+post,fsh);


	var ids= new Float32Array(w*w*2);
	var i=0;
	for(var y=0; y!=w; y++){
		for(var x=0; x!=w; x++){
			ids[i++]= y/w;
			ids[i++]= x/w;
		}
	}
	this.vbao= new VBAO(gl.POINTS,ids,[[2,gl.FLOAT,false]]);
	this.vbao.count= count;

	renderprog.use();
	gl.uniform1i(uloc('p_samp'),0);
	gl.uniform1i(uloc('v_samp'),1);
}
KinematicCompute.accessorVshInclude= `
uniform sampler2D p_samp;
uniform sampler2D v_samp;

attribute vec2 id;
vec3 pos(){
	return texture2D(p_samp, id).xyz;
}
vec3 vel(){
	return texture2D(v_samp, id).xyz;
}
`;
KinematicCompute.prototype.bindTextures= function(){
	gl.activeTexture(gl.TEXTURE1);
	this.vtex.bind();

	gl.activeTexture(gl.TEXTURE0);
	this.ptex.bind();
}

KinematicCompute.prototype.iterate= function(){
	gl.disable(gl.BLEND);
	//this.fbo2.bind();
	this.bindTextures();
	this.prog_iterate.use();
	this.vbao.draw();

	//pingpong
	this.fbo1= this.fbo;
	this.fbo= this.fbo2;
	this.fbo2= this.fbo1;

	this.ptex1= this.ptex;
	this.ptex= this.ptex2;
	this.ptex2= this.ptex1;

	this.vtex1= this.vtex;
	this.vtex= this.vtex2;
	this.vtex2= this.vtex1;

}


function fullscreenQuad(){
	_fsq_vbao.draw();
}
var _fsqv= [
	//01 11  23   pos index
	//00 10  01  
	0,0, 1,0, 0,1,//012 indices
	0,1, 1,0, 1,1 //213
];
var _fsq_vbao;
INIT_QUEUE.push(function(){
	_fsq_vbao= new VBAO(gl.TRIANGLES, 
		new Uint8Array(_fsqv),
		[[2,gl.UNSIGNED_BYTE,false]]
	);
});


//https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas
//an amazing jury rig
function dom2image(element, w,h, callback){
	var uri= 'data:image/svg+xml;charset=utf-8,'
	+ encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" width="`+w+`" height="`+h+`">
			<foreignObject style="
				positon:absolute;
				top:0px;
				left:0px;
				width:100%;
				height:100%;
				background-color: white;
				font-family: calibri;
			" width="100%" height="100%">
				<div xmlns="http://www.w3.org/1999/xhtml">
				 `+element.innerHTML+`
				</div>
			</foreignObject>
		</svg>
	`);

	var img= new Image();
	img.onload= function(){
		callback(img);
	}
	img.src= uri;

	return img;
}



/* GL INIT
###########   ###           ###########  ######     ###   ###########  ###########   
###########   ###           ###########  ######     ###   ###########  ###########   
###           ###               ###      ### ###    ###       ###          ###       
###           ###               ###      ### ###    ###       ###          ###       
###           ###               ###      ###   ###  ###       ###          ###       
###     ###   ###               ###      ###   ###  ###       ###          ###       
###     ###   ###               ###      ###    ### ###       ###          ###       
###########   ###########   ###########  ###     ######   ###########      ###       
###########   ###########   ###########  ###      #####   ###########      ###       
*/
function initGL(){
	////
	//Extension loading
	var err= '';
	if(!gl.getExtension('WEBGL_draw_buffers'))
		err+= 'Multi drawbuffers unsupported\n';
	if(!gl.getExtension('OES_texture_float'))
		err+= 'Float textures unsupported\n';
	if(!gl.getExtension('OES_vertex_array_object'))
		err+= 'VAOs unsupported\n';
	if(!!err.length){
		alert(err);
		throw err;
	}
	
	//This method of loading extensions is either retarded or genius
	for(var ext of gl.getSupportedExtensions()){
		ext= gl.getExtension(ext);

		for(var extkey in Object.getPrototypeOf(ext)){
			var extval= ext[extkey];
			if(extval instanceof Function)
				extval= extval.bind(ext);

			extkey= extkey.replace( /_*(EXT|OES|WEBGL|ANGLE)_*/ ,'');
			if(!gl[extkey])
				gl[extkey]= extval;
			//NOTHING COULD EVER GO WRONG LOL
		}
	}

	////
	//dequeue and execute initializers
	for(var fun of INIT_QUEUE)
		fun();
}
