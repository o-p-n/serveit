use super::config::Settings;
use axum::{http::Request, middleware, response::Response, Router};
use tower_http::services::ServeDir;

pub fn create(settings: &Settings) -> Router {
    let dir = ServeDir::new(settings.root_dir());

    Router::new()
        .nest_service("/", dir)
        .layer(middleware::from_fn(loggit))
}

async fn loggit<Body>(req: Request<Body>, next: middleware::Next<Body>) -> Response {
    let method = String::from(req.method().as_str());
    let path = String::from(req.uri().path());

    let response = next.run(req).await;

    let status = response.status().as_u16();

    tracing::info!("{} {} - {}", method, path, status);

    response
}
