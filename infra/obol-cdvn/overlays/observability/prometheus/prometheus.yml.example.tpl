global:
  scrape_interval: 30s
  evaluation_interval: 30s
  external_labels:
    service_owner: "$SERVICE_OWNER"
    cluster_name: "$CLUSTER_NAME"
    cluster_peer: "$CLUSTER_PEER"

remote_write:
  - url: https://vm.monitoring.gcp.obol.tech/write
    authorization:
      credentials: "$PROM_REMOTE_WRITE_TOKEN"
    write_relabel_configs:
      - source_labels: [job]
        regex: "charon|mev-boost|lodestar|web3signer"
        action: keep

scrape_configs:
  - job_name: "nethermind"
    static_configs:
      - targets: ["nethermind:8008"]

  - job_name: "lighthouse"
    static_configs:
      - targets: ["lighthouse:5054"]

  - job_name: "charon"
    static_configs:
      - targets: ["charon:3620"]
    relabel_configs:
      - target_label: alert_discord_ids
        replacement: "$ALERT_DISCORD_IDS"

  - job_name: "mev-boost"
    static_configs:
      - targets: ["mev-mevboost:18551"]

  - job_name: "lodestar"
    static_configs:
      - targets: ["__VC_METRICS_TARGET__"]

  - job_name: "web3signer"
    static_configs:
      - targets: ["__WEB3SIGNER_METRICS_TARGET__"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
