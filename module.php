<?php 
/**
 * Модуль Webos
 * 
 * @version $Id: module.php 96 2009-10-16 13:10:09Z roosit $
 * @package Abricos 
 * @subpackage Webos
 * @copyright Copyright (C) 2008 Abricos All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

class CMSModWebos extends Ab_Module {
	
	/**
	 * Конструктор
	 */
	public function __construct(){
		// Версия модуля
		$this->version = "0.1.2";
		
		// Название модуля
		$this->name = "webos";
		
		// $this->takelink = "__super";
		$this->takelink = "webos";
	}

	public function GetContentName(){
		
		if (Abricos::$user->id == 0){
			return "index_guest";
		}
		$cname = 'index';
		
		if ($this->registry->adress->level >= 1 && 
			$this->registry->adress->dir[0] == 'upload'){
			$cname = 'upload';
		}
		
		return $cname;
	}
}

Abricos::ModuleRegister(new CMSModWebos());

?>