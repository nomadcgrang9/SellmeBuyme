const timestamp = () => new Date().toISOString();

const formatDetails = (details) => {
  if (details === undefined || details === null) {
    return '';
  }
  if (typeof details === 'string') {
    return ` ${details}`;
  }
  if (details instanceof Error) {
    return ` {"error":{"message":"${details.message}","stack":"${details.stack}"}}`;
  }
  try {
    const json = JSON.stringify(details);
    if (!json || json === '{}' || json === '[]') {
      return '';
    }
    return ` ${json}`;
  } catch (error) {
    return ` ${String(details)}`;
  }
};

export function logInfo(scope, message, details) {
  console.log(`[${timestamp()}][INFO][${scope}] ${message}${formatDetails(details)}`);
}

export function logWarn(scope, message, details) {
  console.warn(`[${timestamp()}][WARN][${scope}] ${message}${formatDetails(details)}`);
}

export function logDebug(scope, message, details) {
  console.debug(`[${timestamp()}][DEBUG][${scope}] ${message}${formatDetails(details)}`);
}

export function logStep(scope, step, details) {
  console.log(`[${timestamp()}][STEP][${scope}] ${step}${formatDetails(details)}`);
}

export function logError(scope, message, error, details) {
  const payload = {};
  if (details !== undefined && details !== null) {
    if (typeof details === 'object' && !(details instanceof Error)) {
      Object.assign(payload, details);
    } else {
      payload.details = details;
    }
  }
  if (error instanceof Error) {
    payload.error = { message: error.message, stack: error.stack };
  } else if (error !== undefined) {
    payload.error = error;
  }
  const formatted = formatDetails(Object.keys(payload).length ? payload : undefined);
  console.error(`[${timestamp()}][ERROR][${scope}] ${message}${formatted}`);
}
