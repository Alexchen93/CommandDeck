import { Activity, Bot, FileText, Globe, Server } from 'lucide-react';
import type { AuthorizedAsset, Job } from '../domain/models';

type RightRailProps = {
  assets: AuthorizedAsset[];
  jobs: Job[];
};

export function RightRail({ assets, jobs }: RightRailProps) {
  const runningJobs = jobs.filter((job) => job.status === 'running').length;

  return (
    <aside className="right-rail">
      <section className="panel compact-panel">
        <div className="panel-heading">
          <span>SystemInfoWidget</span>
          <Activity size={16} />
        </div>
        <div className="metric-grid">
          <Metric label="CPU" value="18%" />
          <Metric label="RAM" value="42%" />
          <Metric label="Disk" value="61%" />
          <Metric label="Jobs" value={String(runningJobs)} />
        </div>
      </section>

      <section className="panel compact-panel">
        <div className="panel-heading">
          <span>Authorized Assets</span>
          <Server size={16} />
        </div>
        <div className="asset-list">
          {assets.map((asset) => (
            <div key={asset.id} className="asset-row">
              <strong>{asset.name}</strong>
              <span>{asset.value}</span>
              <small>{asset.scope}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel widget-stack">
        <WidgetStub icon={<FileText size={17} />} title="FileViewerWidget" />
        <WidgetStub icon={<Bot size={17} />} title="AIHelperWidget" />
        <WidgetStub icon={<Globe size={17} />} title="WebViewWidget" />
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WidgetStub({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="widget-stub">
      {icon}
      <span>{title}</span>
    </div>
  );
}
