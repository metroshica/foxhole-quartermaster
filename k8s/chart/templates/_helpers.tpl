{{/*
Expand the name of the chart.
*/}}
{{- define "fq.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "fq.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fq.labels" -}}
helm.sh/chart: {{ include "fq.name" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: foxhole-quartermaster
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "fq.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fq.fullname" . }}-web
app.kubernetes.io/component: web
{{- end }}

{{/*
Scanner selector labels
*/}}
{{- define "fq.scanner.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fq.fullname" . }}-scanner
app.kubernetes.io/component: scanner
{{- end }}

{{/*
Postgres selector labels
*/}}
{{- define "fq.postgres.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fq.fullname" . }}-postgres
app.kubernetes.io/component: postgres
{{- end }}

{{/*
Derive builder image tag from web image tag.
web-sha-abc1234 -> builder-sha-abc1234
*/}}
{{- define "fq.builderTag" -}}
{{- .Values.web.image.tag | replace "web-" "builder-" }}
{{- end }}

{{/*
Internal scanner URL (service-to-service)
*/}}
{{- define "fq.scannerUrl" -}}
http://{{ include "fq.fullname" . }}-scanner:{{ .Values.scanner.port }}
{{- end }}

{{/*
Internal postgres host (service-to-service)
*/}}
{{- define "fq.postgresHost" -}}
{{ include "fq.fullname" . }}-postgres
{{- end }}
