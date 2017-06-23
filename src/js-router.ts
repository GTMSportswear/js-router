import { ViewEngine } from './github/gtmsportswear/js-view-engine@1.0.1/js-view-engine';
import { closest, isNewTabClick } from './github/gtmsportswear/js-utilities@1.0.0/js-utilities';

export interface RouteTable {
  [route: string]: Function;
}

export interface IRouter {
  init(): void;
  setupView(node: Element): void;
  getRoute(): string;
}

/** 
 * Router for use with GTM single page applications.
 */
export class Router implements IRouter {
  private baseRoute: string;
  private route: string;
  private pathVars: string[];
  private queryString: string;
  
  /**
   * Gets the route from the hash if no baseRoute is set (default behavior) or gets a route from an actual path if a base route is defined.
   * @param routes
   * @param baseRoute? string
   */
  constructor(private routes: RouteTable, private container: Element, private baseRoutes = ['/']) {
    this.baseRoutes = this.baseRoutes.map(route => route.toLowerCase());
    this.listen();
  }

  /**
   * Initiates the function connected to the present route as determined by the routes property.
   */
  public init(): void {
    this.setupRoutes();

    if (!this.routes[this.route])
      throw new Error('No valid route found.');
    if (!this.container)
      throw new Error('No container found.');
    
    const viewEngine = new ViewEngine();
    viewEngine.addViewLoadedHook(this.setupView.bind(this));

    this.container.innerHTML = '';
    this.routes[this.route](this.pathVars, this.queryString, viewEngine, this.route);

    if (window.analytics)
      window.analytics.page({
        name: this.route,
        properties: {
          url: `${window.location.pathname.toLowerCase()}${this.queryString}`
        }
      });
  }

  /**
   * Takes in a dom element and adds event listeners to all elements with data-route to re-initiate the router.
   * @param node
   */
  public setupView(node: Element): void {
    Array.prototype.forEach.call(node.querySelectorAll('a'), el => {
        el.addEventListener('click', this.dataRouteClickEvent.bind(this));
      });
  }

  /**
   * Getter for current base route.
   */
  public getBaseRoute(): string {
    return this.baseRoute;
  }

  /** 
   * Getter for route.
   */
  public getRoute(): string {
    return this.route;
  } 

  private setupRoutes(): void {
    this.queryString = window.location.search.toLowerCase();
    this.route = this.getPathRoute(window.location.pathname.toLowerCase());

    if (this.route)
      this.pathVars = this.extractPathVariables(window.location.pathname.toLowerCase(), this.route);
  }

  private getPathRoute(path: string): string {
    for (const routeKey in this.routes)
      if (this.routes.hasOwnProperty(routeKey))
        if (this.isRouteMatch(path, routeKey))
          return routeKey;
    
    return null;
  }

  private isRouteMatch(path: string, route: string): boolean {
    const pathMinusBase = this.extractBaseRoute(path),
          pathSections = this.removeStartingSlashes(pathMinusBase).split('/'),
          routeSections = route.split('/');
    
    for (let i = 0, l = routeSections.length; i < l; i++)
        if (!routeSections[i].match(/^\{[\w]*\}/i))
          if (routeSections[i] !== pathSections[i])
            return false;
        
    return true;
  }

  private extractPathVariables(path: string, route: string): any {
    const pathVars: any = {},
          pathMinusBase = this.extractBaseRoute(path),
          pathSections = this.removeStartingSlashes(pathMinusBase).split('/'),
          routeSections = route.split('/');

    routeSections.forEach((routeSection, index) => {
      if (routeSection.match(/^\{[\w]*\}/i))
        pathVars[routeSection.replace(/[/{|/}]/g, '')] = pathSections[index];
    });
    
    return pathVars;
  }

  private extractBaseRoute(path: string): string {
    for (const base of this.baseRoutes)
      if (path.indexOf(base) >= 0) {
        this.baseRoute = base;
        return path.replace(base, '');
        }
    return path;
  }

  private extractCompletePath(path: string): string {
    const cleanPath = path.replace(/^\//, ''),
          lastCharPos = cleanPath.indexOf('?') || cleanPath.length - 1;
    return cleanPath.substr(0, lastCharPos);
  }

  private removeStartingSlashes(path: string): string {
    return path.replace(/^\/{1,}/i, '');
  }

  private dataRouteClickEvent(e: MouseEvent): void {
    const target = <HTMLElement>e.target, 
          href = closest(target, 'a').getAttribute('href'),
          newRoute = this.extractCompletePath(href),
          isValidRoute = this.getPathRoute(`${newRoute}`);

    if (null !== isValidRoute && !isNewTabClick(e) && href.substring(0, 1) !== '#' && this.isMatchingBaseURL(href)) {
      e.preventDefault();
      this.updateAppInsteadOfFollowingLink(href);
    }
  }

  private updateAppInsteadOfFollowingLink(newRoute: string) {
    window.history.pushState({}, '', `${newRoute}`);
    this.init();
    window.scrollTo(0, 0);
  }

  private listen(): void {
    window.addEventListener('popstate', e => {
      e.preventDefault();
      this.init();
    });
  }

  private isMatchingBaseURL(url: string) {
    let urlArray = url.split('/');
    if (!urlArray[0].includes('http')) return true;

    let baseUrl = urlArray[0] + '//' + urlArray[2];
    return location.origin === baseUrl;
  }
}
