import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as vscode from "vscode";
import { useState } from "../utils/state";

export class HttpService {
  private static _instance: HttpService;
  private axiosInstance: AxiosInstance;

  private constructor() {
    const baseUrl = vscode.workspace.getConfiguration("platon").get<string>("baseUrl") || "https://platon-preprod.univ-eiffel.fr/";
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
    });
  }

  private async initialize(context: vscode.ExtensionContext) {
    const baseUrl = vscode.workspace.getConfiguration("platon").get<string>("baseUrl") || "https://platon-preprod.univ-eiffel.fr/";
    this.axiosInstance = axios.create({
      baseURL: `${baseUrl}api/v1/`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    this.axiosInstance.interceptors.request.use(
      async (config: axios.InternalAxiosRequestConfig) => {
        const accessToken = await context.secrets.get("accessToken");
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response &&
          error.response.status === 403 &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          const response = await this.axiosInstance.post("auth/refresh/", {
            refresh: await context.secrets.get("refreshToken"),
          });
          await context.secrets.store(
            "accessToken",
            response.data.resource.accessToken
          );
          axios.defaults.headers.common["Authorization"] =
            "Bearer " + response.data.resource.accessToken;
        }
        return Promise.reject(error);
      }
    );
  }

  public static async instance(): Promise<HttpService> {
    const context = useState<vscode.ExtensionContext>("context");
    if (!HttpService._instance) {
      HttpService._instance = new HttpService();
      if (!context) {
        throw new Error("Context is required to initialize HttpService.");
      }
      await HttpService._instance.initialize(context);
    }
    return HttpService._instance;
  }

  public get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const finalConfig = {
      ...config,
      headers: {
        ...(config?.headers || {}), // Merge custom headers
      },
    };
    return this.axiosInstance.put<T>(url, data, finalConfig);
  }

  public delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export default HttpService;
