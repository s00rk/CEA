var express = require('express'),
	app 	= express(),
	stylus	= require('stylus'),
	nib 	= require('nib'),
	server 	= require('http').createServer(app),
	io 		= require('socket.io').listen(server, { log: false });
	
var cons 	= require('consolidate'),
	fs 		= require('fs'),
	sqlite3 = require('sqlite3');

var db;

fs.exists('editorOnline.sqlite', function (exists){	
	if(!exists)
	{
		db = new sqlite3.Database('editorOnline.sqlite');
		db.run("CREATE TABLE IF NOT EXISTS codigos (ID INT PRIMARY KEY, Nombre TEXT, Archivo TEXT)", {}, function (err, row){
			db.run("INSERT INTO codigos VALUES (1, '', '')");	
		});		
	}else{
		db = new sqlite3.Database('editorOnline.sqlite');
	}
});


var oneDay = 86400000;

function compile(str, path) {
	return stylus(str)
		.set('filename', path)
		.set('compress', true)
		.use(nib());
}

server.listen(3000);

app.set('view engine', 'jade');

app.use(stylus.middleware(
	{ 
		src: './public',
		compile: compile
	}
));
app.use( express.static('./public', { maxAge: oneDay }) );

app.get('/', function (req, res){	
	res.render('inicio');
});

app.get('/crear/:nombre', function (req, res){
	var nombre = req.params.nombre;
	var nid = 1;
	
	db.get("SELECT MAX(ID) as 'ID' FROM codigos",{}, function (err, row){
		if(err)
			res.send( { err: 'Error Al Obtener un ID' } );
		else{
			if(row.ID != "null")
				nid = parseInt(row.ID) + 1;

			var ts_hms = new Date();
			var archivo = nombre + '_' + (ts_hms.getFullYear() + '-' + (ts_hms.getMonth()+1) + '-' + ts_hms.getDate() + '_' + ts_hms.getHours() + '-' + ts_hms.getMinutes() + '-' + ts_hms.getSeconds());
			archivo += '.txt';
			db.run("INSERT INTO codigos (ID, Archivo, Nombre) VALUES ($id, $nombre, $archivo)", { $id: nid, $nombre: archivo, $archivo: nombre }, function (lastID, changes){			
				
				res.send( { ID: nid } );
			});
		}
	});
});

app.get('/documento/:id', function (req, res){
	var id = parseInt(req.params.id);
	if(isNaN(id))
	{
		res.render('404');
		return;
	}
	
	db.get("SELECT Nombre, Archivo FROM codigos WHERE ID = $id", { $id: id }, function (err, row){
		if(typeof row == "undefined")
		{			
			res.render('404');
			return;
		}
		var nombreFile = row.Nombre;
		var archivo = row.Archivo;
		var file = "./data/" + archivo;
		var codigo = "";

		fs.exists(file, function (exists) {
			if(exists)
			{
				codigo = fs.readFileSync(file, 'utf8');			
			}
			var files = fs.readdirSync('./public/codemirror/mode');
			var arch = Array();
			var t = 0;
			for(var i = 0; i < files.length; i++)
			{
				if(files[i] != "meta.js" && files[i] != "rpm")
				{
					arch[t++] = files[i];					
				}
			};
			res.render('documento', { 'archivo' : nombreFile, 'codigo' : codigo, 'archivosJs': arch });
		});


	});

});

app.get('*', function (req, res){
	res.render('404');
});

var connection = function (socket){	
	var address = socket.handshake.address;
	console.log("Nueva Conexion desde " + address.address + ":" + address.port);

	socket.on('escribir', function (data){		
		var room = socket.room;

		db.get("SELECT Archivo FROM codigos WHERE ID = $id", { $id: room }, function (err, row){
			console.log(row);
			if(typeof row == "undefined")
			{
				return;
			}
			console.log(row);
			fs.writeFile('./data/' + row.Archivo, data.codigo, function (err){
				if(!err)
				{
					console.log(address.address + ' hizo un cambio en: ' + room);					
				}
				console.log(err);
			});
		});
		io.sockets.in( room ).emit('escribir', data);
		
	});

	socket.on('room', function (room){
		socket.room = room;
		socket.join( socket.room );
	});
};

io.sockets.on('connection', connection);

console.log('Aplicacion Iniciada');