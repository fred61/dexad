<?php

require_once 'lib/log.php';
require_once 'lib/ajaxService.php';
require_once 'dbHandler.inc.php';

function createHandler() {
    return new ServersHandler();
}

class ServersHandler
{
    use LoggerTrait;
    use AjaxServiceTrait;
    
    function __construct()
    {
        session_start();
        dbHandler::instance()->initialise($_SESSION['state']);
        session_write_close();
    }
    
    public function get($data) {
        self::getLogger()->debug("get guests handler");
        self::getLogger()->debugDump("data", $data);
        
        $servers= $this->getServerData();
        
        if ($servers === false)  {
            throw new Exception("error querying the database: " . dbHandler::instance()->getDB()->lastErrorMessage());
        } else {
            return self::wrapResult($servers);
        }
    }
    
    private function getServerData()
    {
        $sql=<<<END_SQL
            select vs.id
                  ,vs.hostname
                  ,vs.lbl
                  ,vs.os_id
                  ,f.f_read_access#.virt_srv#owner_list(id) owners
            from   f.virt_srv vs
            where  vs.active = '+'
              and  vs.is_pool_plh is null
              and  not exists (select 1 from f.virt_srv_ownership vso where vso.virt_srv_id = vs.id and vso.af_user_id = -6)
            order by vs.hostname
END_SQL;

        return dbHandler::instance()->getDB()->getSQLResultAsArray($sql);
        
    }
}