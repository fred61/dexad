<?php
require_once ('core/pdo_access.inc.php');
require_once ('core/stdfuncs.inc.php');
require_once ('core/templater.inc.php');
require_once ('bwt/input.inc.php');
require_once ('dbHandler.inc.php');

require_once 'lib/log.php';

class pool_management {
    
    use LoggerTrait;

    private $dbRead;
    
    function __construct()
    {
        $this->dbRead = dbHandler::instance()->getDB();
    }
    
    function getOutput(&$state, $request)
    {
        $html= array();
        
        $html['ownerSelect'] = $this->makeOwnerSelect();
        $html['userSelect']= $this->makeUserSelect();
        $html['osSelect'] = $this->makeOSSelect();
        
        return templater::buildFromFile($html, 'reports/pool_management/report.html');
    }
    
    private function makeUserSelect() 
    {
        $sql= "select * from f.af_user_v order by name";
        
        $users= array();
        foreach($this->dbRead->getSQLResultAsArray($sql) as $row) {
            $users[$row['ID']]= $row['NAME'];
        }
        
        $userSelect= new selector("users", null, $users, false, array('data-item-property' => 'id'));
        
        return $userSelect->render();
    }
    
    private function makeOwnerSelect()
    {
        $sql = <<<END_SQL
        select id
              ,ora_user
              ,name || ' (' || ora_user || ')'   name
        from   f.af_user
        where  acc_status is not null
            or id         < 0
END_SQL;
        
        
        $rows= $this->dbRead->getSQLResultAsArray($sql);
        $afUserId= dbHandler::instance()->getAFUserID();
        
        $comparator= function($a, $b) use ($afUserId) {
            if ($a['ID'] == $afUserId) {
                return ($b['ID'] == $afUserId) ? 0 : -1;
            }
            if ($b['ID'] == $afUserId) {
                return ($a['ID'] == $afUserId) ? 0 : 1;
            }
            
            return strcmp($a['NAME'], $b['NAME']);
        };
        
        usort($rows, $comparator);
        
        $owners= array(null => 'no-one');
        foreach ($rows as $row) {
            $owners[$row['ORA_USER']]= $row['NAME'];
        }
        
        $ownerSelect= new selector("owners", null, $owners, false, array(
            'id'                 => 'owners'
           ,'data-item-property' => 'id'
        ));
        
        return $ownerSelect->render();
    }
    
    private function makeOSSelect() {
        $sql=<<<END_SQL
            select id, name
            from   f.code_os
END_SQL;
        $os= array();
        
        foreach($this->dbRead->getSQLResultAsArray($sql) as $row) {
            $os[$row['ID']]= $row['NAME'];
        }
        
        $osSelect= new selector("os", null, $os, false, array('data-item-property' => 'os'));
        
        return $osSelect->render();
    }
    
    function requiredActions() {
        return array(
            'add_virt_srv_to_pool',
            'rm_virt_srv_from_pool',
            'add_pool',
            'rm_pool'
        );
    }
}
