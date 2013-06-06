$(document).on('ready', function (){

	if(typeof localStorage.MisArchivos != "undefined")
	{
		var obj = $.parseJSON( localStorage.MisArchivos );
		var ul = $("#ultimos");
		var dato;
		for(var i = 0; i < obj.length && i < 10; i++)
		{
			dato = obj[i];
			var temp = new Date(dato.tiempo);
			ul.append( '<li><a href="/documento/' + dato.id + '">' + (i+1) + '.- ' + dato.nombre + ' [' + temp.toLocaleString() + ']</a></li>');
		}
	}

	$("#formDoc").on('submit', function (e){
		e.preventDefault();
		var nombre = $("#nuevoDoc").val();
		if(nombre.trim().length > 0)
		{
			$.get('./crear/' + nombre,
				{ }, function (res){
					if(res.ID != "null")
					{						
						window.location = "./documento/" + res.ID;
					}else
						alert(res.err);
				}
			);
		}
	});

	var mipos = window.location.href.toLowerCase().indexOf('documento/');
	if(mipos > 0)
	{

		var miId = window.location.href.substring( mipos+10, window.location.href.length );
		var filetemp = $("#archivo");
		if(isNaN(miId) || filetemp.text().length <= 0)
		{
			if(!isNaN(miId))
			{
				var obj = $.parseJSON( localStorage.MisArchivos );
				for(var i = 0; i < obj.length; i++)
				{
					if(obj[i].id == miId)
					{
						obj.splice(i, 1);
					}
				}
				localStorage.MisArchivos = JSON.stringify( obj );
		
			}
			return;
		}
		$("#milink").html('Compartir Link: <input style="width: 25em;" type="text" value="' + window.location.href  + '" readonly />');

		if(typeof localStorage.MisArchivos != "undefined")
		{
			var obj = $.parseJSON( localStorage.MisArchivos );
			var existe = false;
			for(var i = 0; i < obj.length; i++)
				if(obj[i].id == miId)
				{
					obj[i].tiempo = Date.parse( Date() );
					existe = true;
				}
			if(!existe)
				obj.push( { id: miId, nombre: $("#archivo").text(),tiempo: Date.parse( Date() ) } );

			for(var i = 0; i < obj.length; i++)
				for(var j = 0; j < obj.length-1; j++)
					if(obj[j+1].tiempo > obj[j].tiempo)
					{
						var temp = obj[j];
						obj[j] = obj[j+1];
						obj[j+1] = temp;
					}

			localStorage.MisArchivos = JSON.stringify( obj );
		}else{
			var obj = [];
			obj.push( { id: miId, nombre: $("#archivo").text(), tiempo: Date.parse( Date() ) } );
			localStorage.MisArchivos = JSON.stringify( obj );
		}



		var myCodeMirror = CodeMirror.fromTextArea(document.getElementById('micodigo'), { tabMode: 'indent'});
		myCodeMirror.setSize( null, 400 );


		

		var archivo = $("#archivo").text();
		var extension = archivo.substring( archivo.lastIndexOf(".")+1 , archivo.length );	
		if(archivo.lastIndexOf(".") < 0)
		{
			extension = "html";
		}

		var cambio = true;

		window.client = io.connect(window.location.origin + "/");

		window.client.on('connect', function() {
			window.client.emit('room', miId);
		});		

		window.client.on('escribir', function (data){
			cambio = false;
			var pos = myCodeMirror.doc.getCursor();
			myCodeMirror.setValue( data.codigo );
			myCodeMirror.doc.setCursor(pos);
		});	
		

		myCodeMirror.on('change', function(data){
			var codigo = myCodeMirror.doc.getValue();
			
			if(cambio == true)
			{
				window.client.emit('escribir', 
				{ 
					"codigo": codigo 
				});
			}
			cambio = true;
			
		});

		$("#tipoCodigo").on('change', function(){
			var tipo = $(this).val();
			myCodeMirror.setOption("mode", tipo);
		});

		$("#tipoCodigo option").each(function(){
			var nombre = $(this).val();
			if(nombre.toLowerCase().indexOf(extension.toLowerCase()) >= 0)
			{
				$("#tipoCodigo").val( nombre );
				myCodeMirror.setOption("mode", nombre);
			}
		});	
	}	

});