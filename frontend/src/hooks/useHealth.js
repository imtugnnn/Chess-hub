import { useEffect, useState } from "react";
import { getHealth } from "../services/api";

export function useHealth() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    getHealth().then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }));
  }, []);
  return state;
}
