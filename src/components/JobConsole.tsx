import { Download, ListChecks } from 'lucide-react';
import type { Job } from '../domain/models';

type JobConsoleProps = {
  jobs: Job[];
};

export function JobConsole({ jobs }: JobConsoleProps) {
  return (
    <footer className="job-console">
      <section className="panel job-queue">
        <div className="panel-heading">
          <span>JobQueueWidget</span>
          <ListChecks size={16} />
        </div>
        <div className="job-table">
          <div className="job-row header">
            <span>Job</span>
            <span>Action</span>
            <span>Status</span>
            <span>Risk</span>
            <span>Controls</span>
          </div>
          {jobs.length === 0 ? (
            <div className="job-empty">No jobs yet.</div>
          ) : (
            jobs.map((job) => (
              <div className="job-row" key={job.id}>
                <code>{job.id}</code>
                <span>{job.actionName}</span>
                <span className={`status ${job.status}`}>{job.status}</span>
                <span className={`risk ${job.risk}`}>{job.risk}</span>
                <button type="button">
                  <Download size={15} />
                  Export
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel live-console">
        <div className="panel-heading">
          <span>LiveConsoleWidget</span>
          <span className="pill">stdout/stderr</span>
        </div>
        <pre>
          {jobs.length === 0
            ? '[idle] Waiting for action execution.'
            : jobs.flatMap((job) => job.output.map((line) => `[${job.id}] ${line}`)).join('\n')}
        </pre>
      </section>
    </footer>
  );
}
