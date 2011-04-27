/*
@version $Id: appbos.js 951 2011-03-29 14:31:36Z roosit $
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.entryPoint = function(){
	
	var os = Brick.mod.bos;
	
	var app = new os.Application(this.moduleName);
	app.icon = '/modules/webos/images/app_icon.gif';
	app.entryComponent = 'os';
	app.entryPoint = 'showWebosPage';
	
	os.ApplicationManager.register(app);
	
};
