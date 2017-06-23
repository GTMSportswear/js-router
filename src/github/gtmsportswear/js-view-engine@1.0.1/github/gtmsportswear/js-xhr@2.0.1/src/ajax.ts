export interface AjaxRequestObject {
  url: string;
  type: string;
  acceptType?: RequestAcceptType;
  data?: {};
  headers?: {};
}

export interface AjaxRequest {
  (req: AjaxRequestObject): Promise<any>;
}

export enum RequestAcceptType {
  any,
  json,
  plainText,
  xml,
  html,
  xhtml
}

/**
 * Makes a vanilla js ajax request and returns a promise.
 * @param req The request parameters.
 */
export const ajax: AjaxRequest = (req: AjaxRequestObject): Promise<any> => {
  return new Promise<any>((success, error) => {
    const httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      error('Browser does not support modern ajax calls.');
      return;
    }

    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status >= 200 && httpRequest.status < 300)
          success(httpRequest.responseText);
        else
          error('There was a problem with the request: ' + httpRequest.responseText);
      }
    };

    httpRequest.open(req.type, req.url);

    let data = req.data;
    if (!FormData.prototype.isPrototypeOf(req.data)) {
      data = convertToEncodedForm(req.data);
      setContentTypeHeader(httpRequest, req.type);
    }

    setAcceptHeader(httpRequest, req.acceptType);
    setHeaders(httpRequest, req.headers);

    httpRequest.send(data);
  });

  function setContentTypeHeader(httpRequest: XMLHttpRequest, method: string): void {
    let type = 'text/plain';

    if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')
      type = 'application/x-www-form-urlencoded';

    httpRequest.setRequestHeader('Content-type', type);
  }

  function setAcceptHeader(httpRequest: XMLHttpRequest, acceptType: RequestAcceptType): void {
    let acceptHeaderText = '*/*';

    switch (acceptType) {
      case RequestAcceptType.json:
        acceptHeaderText = 'application/json';
        break;

      case RequestAcceptType.plainText:
        acceptHeaderText = 'text/plain';
        break;

      case RequestAcceptType.xml:
        acceptHeaderText = 'application/xml';
        break;

      case RequestAcceptType.html:
        acceptHeaderText = 'text/html';
        break;

      case RequestAcceptType.xhtml:
        acceptHeaderText = 'application/xhtml+xml';
        break;
    }

    httpRequest.setRequestHeader('Accept', acceptHeaderText);
  }

  function setHeaders(httpRequest: XMLHttpRequest, headers: {}): void {
    if (undefined === req.headers || null === req.headers) return;

    Object.keys(headers).forEach(key => {
      httpRequest.setRequestHeader(key, headers[key]);
    });
  }

  function convertToEncodedForm(data: {}): string {
    if (undefined === data || null === data) return '';
    const strArr = [];

    Object.keys(data).forEach(key => {
      strArr.push(`${key}=${encodeURIComponent(data[key])}`);
    });

    return strArr.join('&');
  }
};
