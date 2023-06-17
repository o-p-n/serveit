mod app;
mod config;

use crate::config::Settings;
use axum::Router;
use tokio::signal;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    setup_logging();

    // read configuration (ENV)
    let settings = Settings::defaults();
    let app = app::create(&settings);

    tokio::join!(serve_app(&settings, app),);

    tracing::warn!("stopped");
}

fn setup_logging() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_env("SERVEIT_LOG_LEVEL")
                .unwrap_or_else(|_| "serveit=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

async fn serve_app(settings: &Settings, app: Router) {
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], settings.port()));
    tracing::warn!(
        "serving directory {} at http://{}/",
        settings.root_dir(),
        addr
    );
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .with_graceful_shutdown(signal_shutdown())
        .await
        .unwrap();
}

async fn signal_shutdown() {
    signal::ctrl_c().await.expect("could not install signal");

    tracing::warn!("stopping");
}
