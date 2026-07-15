import { headers } from "next/headers";
import { cache } from "react";

import { getAuth } from ".";

export const getSession = cache(async () =>
	getAuth().api.getSession({ headers: await headers() }),
);
