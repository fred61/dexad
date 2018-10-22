<?php

chdir('..');

require_once 'lib/log.php';


class ServiceException extends Exception {
}

interface AuthorisingHandler {
    function checkAuthorisation($method);
    
    function getAuthorisationError();
}

class Service {
	use LoggerTrait;
	
	private const resourcePathParameter= 'restResourcePath';
	
	public function handle()
	{
	    self::getLogger()->debug("start handling: " . $_REQUEST[self::resourcePathParameter]);
	    
		    
		// no output while request being handled
		ob_start();
		$start= microtime(true);			// parameter is get_as_float - if set to false you get a string.
		
		try {
		    $resourcePath= $this->getResourcePath();
		    
		    $handler= $this->getHandler($resourcePath[0]);
		    self::getLogger()->info("handling " . get_class($handler));
		    
		    $method= $this->getMethod();
			self::getLogger()->debug("method is $method");
			
			if ($method === 'POST') {
			    $this->preprocessPostRequest();
			}
			
			if(!method_exists($handler, $method)) {
			    throw new ServiceException("request method " . $method . " not implemented", 501);
			} else {
			    if (($handler instanceof AuthorisingHandler) && !$handler->checkAuthorisation($method)) {
			      $result= array(
			          'status' => 401, 
			          'body' => $handler->getAuthorisationError(), 
			          'headers' => array('Content-Type: text/plain', 'WWW-Authenticate: Basic realm="ADAI REST API"'));
			    } else {
		          $result= $handler->{$method}($resourcePath);
			    }
			}
		} finally {
		    $handled= microtime(true);
		    self::getLogger()->info("handled ". get_class($handler) ." in " . ($handled - $start));
		}
		
		return $result;
	}
	
	private function getResourcePath() {
	    if (!array_key_exists(self::resourcePathParameter, $_REQUEST)) {
	        throw new Exception('required parameter not present in request');
	    }
	    self::getLogger()->debug("path is " . $_REQUEST[self::resourcePathParameter]);
	    
		$resourcePath = explode('/', $_REQUEST[self::resourcePathParameter]);
		if ($resourcePath[count($resourcePath) - 1] == "") {
			unset($resourcePath[count($resourcePath) - 1]);
	}
	    return $resourcePath;
	}
	
	private function getHandler($resourceName) {

        $handlerFile = "api/handlers/" . $resourceName . ".php";
        
        if (!file_exists($handlerFile)) {
            throw new Exception("no handler for " . $resourceName);
        } else {
            self::getLogger()->debug("getting handler file $handlerFile");
            include_once ($handlerFile);
            self::getLogger()->debug("got handler file $handlerFile");
            
            if (function_exists('createHandler')) {
                $res= createHandler();
                self::getLogger()->debug("created handler $handlerFile");
                return $res;
            } else {
                throw new Exception("handler for " . $resourceName . " is broken");
            }
        }
	}

	private function getMethod()
	{
		$result= $_SERVER ['REQUEST_METHOD'];

		// handle method overrides aka verb tunneling
		if ($result == 'POST') {
		    if (array_key_exists('HTTP_X_HTTP_METHOD', $_SERVER)) {
		        return $_SERVER['HTTP_X_HTTP_METHOD'];
		    }

		    if (array_key_exists('HTTP_X_HTTP_METHOD_OVERRIDE', $_SERVER)) {
		        return $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'];
		    }
		    
		    if (array_key_exists('HTTP_X_METHOD_OVERRIDE', $_SERVER)) {
		        return $_SERVER['HTTP_X_METHOD_OVERRIDE'];
		    }
		}
		

		return $result;
	}

	private function preprocessPostRequest()
	{
		self::getLogger()->debug("preprocessing POST");
		
		if (array_key_exists('CONTENT_TYPE', $_SERVER) && $_SERVER['CONTENT_TYPE'] == 'application/json') {
		    self::getLogger()->debug("content type: " . $_SERVER['CONTENT_TYPE']);
		    $rest_json = file_get_contents("php://input");
		    $_POST = json_decode($rest_json, true);
		}
		
		self::getLogger()->debugDump('$_POST', $_POST);
	}
	
}

$svc= new Service();

try {
    $response= $svc->handle();

    if ($response == null) {
        http_response_code(200);
		ob_get_clean();
    } else {
        if (array_key_exists('status', $response)) {
            http_response_code($response['status']);
        }
        
        if (array_key_exists('headers', $response) && is_array($response['headers'])) {
            foreach($response['headers'] as $header) {
                header($header);
            }
        }
        
        if (array_key_exists('body', $response)) {
        echo $response['body'] . ob_get_clean();
        }
    }
    
} catch (ServiceException $e) {
    http_response_code($e->getCode());
    header('Content-Type: text/plain');
    echo $e->getMessage() . ob_get_clean();
} catch(Throwable $t) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo "exception handling request: " . $t->getMessage() . ob_get_clean();
}

?>