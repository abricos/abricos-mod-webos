/*
@version $Id: manager.js 156 2009-11-09 08:17:11Z roosit $
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

/**
 * @module Webos
 * @namespace Brick.mod.webos
 */

var Component = new Brick.Component();
Component.requires = {
	yahoo: ['dom', 'dragdrop', 'resize'],
    mod:[
         {name: 'webos', files: ['api.js']},
         {name: 'sys', files: ['container.js', 'permission.js']}
    ]
};
Component.entryPoint = function(){
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;

	var __selfCT = this;
	
	var NS = this.namespace,
		TMG = this.template;
	
(function(){

	var BrickPanel = Brick.widget.Panel;
	
	var Panel = function(config){
		config = config || {};
		
		if (config.modal){
			config.parentNode = document.body;
		}else{
			config.parentNode = NS.Workspace.instance.container;
		}
        Panel.superclass.constructor.call(this, config);
	};
	Panel.STATE_NORMAL = 0;
	Panel.STATE_MAXIMIZED = 1;
	Panel.STATE_MINIMIZED = 2;
	
	YAHOO.extend(Panel, BrickPanel, {
		init: function(el, config){
			Panel.superclass.init.call(this, el, config);
			if (config.modal){
				return;
			}
			var ws = NS.Workspace.instance;
			ws.panelManager.register(this);
		}
	});
	
	Panel.showPanel = BrickPanel.showPanel;
	
	NS.Panel = Panel;

	Brick.widget.Panel = Panel;
})();

(function(){
	
	var ApplicationManager = new (function(){
		
		var apps = [];

		// зарегистрировать приложение
		this.register = function(app){
			apps[apps.length] = app;
		};
		
		this.each = function(func){
			for (var i=0;i<apps.length;i++){
				if (func(apps[i])){
					return apps[i];
				}
			}
			return null;
		};
		
		// Автозагрузка
		var startup = [];
		
		this.startupRegister = function(func){
			startup[startup.length] = func;
		};
		
		this.startupEach = function(func){
			for (var i=0;i<startup.length;i++){
				func(startup[i]);
			}
		};
		
	});
	
	NS.ApplicationManager = ApplicationManager;
})();

(function(){
	
	var LW = 80, LH = 80, DX = 20, DY = 20;
	
	var Workspace = function(){
		var container = Dom.get("workspace");
		this.init(container);
	};
	
	Workspace.instance = null;
	
	Workspace.prototype = {
		
		_panels: {},
		
		init: function(container){
			Workspace.instance = this;
			this.labels = {};
			this.container = container;
			
			var __self = this;
			Brick.Permission.load(function(){
				__self._initApplication();
			});
			
			var __self = this;
            E.on(window, "resize", function(event){
            	__self._setWorkspaceSize();
            });
            this._setWorkspaceSize();
		},
		
		_initApplication: function(){
			this._setWorkspaceSize();
			var list = [];
			// сформировать список модулей имеющих компонент 'app' в наличие
			for (var m in Brick.Modules){
				if (Brick.componentExists(m, 'app') && !Brick.componentLoaded(m, 'app')){
					list[list.length] = {name: m, files:['app.js']};
				}
			}
			var __self = this;
			if (list.length > 0){
				Brick.Loader.add({ 
					mod: list,
					onSuccess: function() { 
						__self.renderDesktopLabels(); 
					}
				});
			}else{
				__self.renderDesktopLabels(); 
			}
		},
		
		_setWorkspaceSize: function(){
			var r = Dom.getClientRegion();
			var el = this.container;
			
            Dom.setStyle(el, "width", (r.width)+'px');
            Dom.setStyle(el, "height", (r.height-32)+'px');
		},
		
		renderDesktopLabels: function(){
			this.panelManager = new PanelManager();
			
			Dom.get('os_minapps').style.display = '';
			Dom.get('os_minapp_right').style.display = '';
			Dom.get('os_firstloading').style.display = 'none';
			
			var __self = this;
			NS.ApplicationManager.each(function(app){
				if (!__self.labelExist(app.getId())){
					var label = new NS.DesktopLabel(app);
					__self.addLabel(label);
				}
			});
			
			// startup
			NS.ApplicationManager.startupEach(function(startup){
				startup();
			});
		},
		
		labelExist: function(labelName){
			if (this.labels[labelName]){
				return true;
			}
			return false;
		},
		
		addLabel: function(label){
			if (this.labelExist(label.getId())){
				return;
			}
			label.buildLabel(this, DX, DX);
			this.labels[label.getId()] = label;
			this.orderLabelPosition();
		},
		
		orderLabelPosition: function(){
			var x = DX, y = DY;
			for (var n in this.labels){
				var lbl = this.labels[n];
				lbl.setPositionLabel(x, y);
				y += DX+LH;
			}
		}
	};
	NS.Workspace = Workspace;
	
	
	var MinApp = function(owner, panel){
		this.init(owner, panel);
	};
	MinApp.prototype = {
		init: function(owner, panel){
			this.owner = owner;
			this.panel = panel;
			var TM = TMG.build('minapp'), T = TM.data, TId = TM.idManager;
			this._TM = TM; this._T = T; this._TId = TId;
			
			var div = document.createElement('div');
			div.innerHTML = TM.replace('minapp', {
				'label': panel.header.innerHTML 
			});
			this.element = div.childNodes[0];
			
			panel.focusEvent.subscribe(this.panelFocusEvent, this, true);
		},
		onClick: function(el){
			var tp = this._TId['minapp'];
			switch(el.id){
			case tp['id']:
			case tp['status']:
			case tp['label']:
				this.changeStatus();
				return true;
			}
			return false;
		},
		changeStatus: function(){
			var state = this.panel.cfg.getProperty('state');
			if (state == 2){
				this.panel.show();
			}else{
				var activeOverlay = this.owner.getActivePanel();
				if (activeOverlay == this.panel){
					this.panel.hide();
					var lastPanel = this.owner.getActivePanel();
					this.owner.focus(lastPanel);
					this.owner.setActivePanel(lastPanel);
					return;
				}
			}
			this.owner.focus(this.panel);
		},
		destroy: function(){
			this.panel.focusEvent.unsubscribe(this.panelFocusEvent);
			this.panel = null;
			this.owner = null;
		},
		panelFocusEvent: function(){
			this.owner.setActivePanel(this.panel);
		},
		setMinAppStatus: function(isActive){
			var el = this._TM.getEl('minapp.status');
			var oldClass = !isActive ? 'os_minapp_show' : 'os_minapp_hide';
			var newClass = isActive ? 'os_minapp_show' : 'os_minapp_hide';
			Dom.replaceClass(el, oldClass, newClass);
		}
	};
	
	var PanelManager = function (){
		PanelManager.superclass.constructor.call(this);
	};
	YAHOO.extend(PanelManager, YAHOO.widget.OverlayManager, {
		init: function(userConfig){
			PanelManager.superclass.init.call(this, userConfig);

			var container = Dom.get('os_minapp_in');

			var __self = this;
			E.on(container, 'click', function(e){
				var el = E.getTarget(e);
				if (__self.onClick(el)){ E.preventDefault(e); }
			});
			this._minAppContainer = container;
		},
		register: function (overlay){
			PanelManager.superclass.register.call(this, overlay);
			
			var minApp = new MinApp(this, overlay);
			this._minAppContainer.appendChild(minApp.element);

            overlay.cfg.addProperty('minApp', {value: minApp});
            
            overlay.closeEvent.subscribe(this._onOverlayClose, this, true);
			this.focus(overlay);
		},
		_onOverlayClose: function(p_sType, p_aArgs){
			var minApp = p_aArgs[0].cfg.getProperty('minApp');
			this._minAppContainer.removeChild(minApp.element);
		},
        _onOverlayDestroy: function (p_sType, p_aArgs, overlay) {
			overlay.closeEvent.unsubscribe(this._onOverlayClose);
			PanelManager.superclass._onOverlayDestroy.call(this, p_sType, p_aArgs, overlay);
		},
		onClick: function(el){
			var ovs = this.overlays, minApp;
			for (var i=0;i<ovs.length;i++){
				minApp = ovs[i].cfg.getProperty('minApp');
				if (minApp.onClick(el)){ return true; }
			}
			return false;
		},
		setActivePanel: function(overlay){
			var ovs = this.overlays;
			for (var i=0;i<ovs.length;i++){
				var ov = ovs[i];
				ov.cfg.getProperty('minApp').setMinAppStatus(ov == overlay);
			}			
		},
		getActivePanel: function(){
			var actOverlay = this.getActive();
			if (!L.isNull(actOverlay) && actOverlay.cfg.getProperty('state') != 2){
				return actOverlay;
			}
			var ovs = this.overlays;
			for (var i=ovs.length-1;i>=0;i--){
				if (ovs[i].cfg.getProperty('state') != 2){
					return ovs[i];
				}
			}
			return null;
		}
	});

})();

(function(){
	
	var DesktopLabel = function(app){
		this.initLabel(app);
	};
	YAHOO.extend(DesktopLabel, YAHOO.util.DD, { 
		initLabel: function(app){
		
			this.app = app;
			
			var TM = TMG.build('label'), T = TM.data, TId = TM.idManager;
			this._T = T; this._TId = TId; this._TM = TM;
		}, 
		getId: function(){
			return this.app.getId();
		},
		buildLabel: function(workspace){
			var app = this.app;
			var div = document.createElement('DIV');
			div.innerHTML = this._TM.replace('label', {
				'name': app.name,
				'icon': app.icon,
				'title': app.getTitle()
			});
			var el = div.childNodes[0];
			el.style.display = 'none';
			div.removeChild(el);
			
			workspace.container.appendChild(el);
			this.element = el;
			el.style.display = '';
			
			// call DragDrop.init method
			this.init(this.element, '', {});
			
			E.on(el, 'click', this.onClickLabel, this, true);
			
			this._ddmove = false;
		},
		
		onClickLabel: function(){
			if (this._ddmove){
				this._ddmove = false;
				return;
			}
			
			this.app.fireEntryPoint();
		}, 
		
		setPositionLabel: function(left, top){
			var el = this.element;
			el.style.left = left+'px';
			el.style.top = top+'px';
		},
		
		startDrag: function(x, y){
			var el = this.getEl();
			
			Dom.setStyle(el, "opacity", 0.2); 
			
			var style = el.style;

	        this.origZ = style.zIndex;
	        style.zIndex = 999;
	        this.origCursor = style.cursor;
	        style.cursor = 'move';
		},
		
		endDrag: function(e) {
			var el = this.getEl();
			Dom.setStyle(el, "opacity", 1); 
			var style = el.style;
			
	        style.zIndex = this.origZ;
	        style.cursor = this.origCursor;
	        this._ddmove = true;
	    }
		
	});
	
	NS.DesktopLabel = DesktopLabel; 
})();

(function(){
	
	/**
	 * Приложение WebOS.
	 * 
	 * @class Application
	 * @constructor
	 * @param {String} moduleName Имя модуля которому пренадлежит приложение.
	 * @param {String} name Имя приложения
	 */
	var Application = function(moduleName, name){
		name = name || moduleName;

		/**
		 * Имя модуля.
		 * @property moduleName
		 * @type String
		 */
		this.moduleName = moduleName;
		
		/**
		 * Имя приложения
		 * @property name
		 * @type String
		 * @default <i>moduleName</i>
		 */
		this.name = name;
		
		/**
		 * Надпись ярлыка.
		 * @property title
		 * @type String
		 */
		this.title = '';
		
		/**
		 * Идентификатор надписи в менеджере фраз. Например: "mod.user.cp.title"
		 * @property titleId
		 * @type String
		 * @default mod.<i>moduleName</i>.cp.title
		 */
		this.titleId = "mod."+moduleName+'.app.title';
		
		/**
		 * Путь к иконке
		 * @property icon
		 * @type String
		 * @default modules/user/css/images/cp_icon_default.gif
		 */
		this.icon = "";
		
		/**
		 * Компонент этого модуля, который должен быть загружен, 
		 * когда будет клик по ярлыку приложения.<br>
		 * Установите значение пустым, если подгрузка компонента ненужна.  
		 * @property entryComponent
		 * @type String
		 */
		this.entryComponent = '';
		
		/**
		 * Точка входа (функция), которая будет выполнена по клику на ярлык. 
		 * @property entryPoint
		 * @type String | Function
		 */
		this.entryPoint = null;
		
		/**
		 * Получить надпись.
		 * 
		 * @method getTitle
		 * @return {String}  
		 */
		this.getTitle = function(){
			var phrase = Brick.util.Language.getc(this.titleId);
			if (L.isString(phrase)){
				return phrase;
			}
			return this.title != '' ? this.title : this.name; 
		};
		
		/**
		 * Получить идентификатор. 
		 * 
		 * @method getId
		 * @return {String}  
		 */
		this.getId = function(){
			return this.moduleName+'_'+this.name;
		};
		
		/**
		 * Пользователь запустил приложение, необходимо выполнить 
		 * функцию указанную в entryPoint. Если указан entryComponent,
		 * то необходимо его подгрузить перед выполнением функции.
		 * 
		 * @method fireEntryPoint
		 */
		this.fireEntryPoint = function(){
			
			var __self = this;
			
			var fire = function(){
				var fn;
				if (L.isFunction(__self.entryPoint)){
					fn = __self.entryPoint;
				}else{
					fn = Brick.convertToObject(__self.entryPoint); 
				}
				if (L.isFunction(fn)){
					fn();
				}
			};
			
			if (this.entryComponent != ''){
				if (!Brick.componentLoaded(this.moduleName, this.entryComponent)){
					Brick.Component.API.fireFunction(this.moduleName, this.entryComponent, function(){
						fire();
					});
				}else{
					fire();
				}
			}else{
				fire();
			}
		};

	};
	
	NS.Application = Application;
	
})();

(function(){
	
	
})();

};