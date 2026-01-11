import "server-only";

import { gateway, LanguageModel } from "ai";
import { ChatModel } from "app-types/chat";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
  XAI_FILE_MIME_TYPES,
} from "./file-support";

// ============================================================================
// 模型配置 - 使用 Vercel AI Gateway
// ============================================================================

type ModelConfig = {
  id: string; // gateway model id: "provider/model"
  name: string; // 显示名称
  toolCallUnsupported?: boolean;
  imageInputUnsupported?: boolean;
  fileMimeTypes?: readonly string[];
};

type ProviderConfig = {
  provider: string;
  models: ModelConfig[];
};

// 所有模型配置集中定义
const modelConfigs: ProviderConfig[] = [
  {
    provider: "openai",
    models: [
      {
        id: "openai/gpt-4.1",
        name: "gpt-4.1",
        fileMimeTypes: OPENAI_FILE_MIME_TYPES,
      },
      {
        id: "openai/gpt-4.1-mini",
        name: "gpt-4.1-mini",
        fileMimeTypes: OPENAI_FILE_MIME_TYPES,
      },
      { id: "openai/o4-mini", name: "o4-mini", toolCallUnsupported: true },
      { id: "openai/o3", name: "o3" },
      { id: "openai/gpt-5.1-chat-latest", name: "gpt-5.1-chat" },
      { id: "openai/gpt-5.1", name: "gpt-5.1" },
      { id: "openai/gpt-5.1-codex", name: "gpt-5.1-codex" },
      { id: "openai/gpt-5.1-codex-mini", name: "gpt-5.1-codex-mini" },
    ],
  },
  {
    provider: "google",
    models: [
      {
        id: "google/gemini-2.5-flash-lite",
        name: "gemini-2.5-flash-lite",
        fileMimeTypes: GEMINI_FILE_MIME_TYPES,
      },
      {
        id: "google/gemini-2.5-flash",
        name: "gemini-2.5-flash",
        fileMimeTypes: GEMINI_FILE_MIME_TYPES,
      },
      { id: "google/gemini-3-pro-preview", name: "gemini-3-pro" },
      {
        id: "google/gemini-2.5-pro",
        name: "gemini-2.5-pro",
        fileMimeTypes: GEMINI_FILE_MIME_TYPES,
      },
    ],
  },
  {
    provider: "anthropic",
    models: [
      {
        id: "anthropic/claude-sonnet-4-5",
        name: "sonnet-4.5",
        fileMimeTypes: ANTHROPIC_FILE_MIME_TYPES,
      },
      { id: "anthropic/claude-haiku-4-5", name: "haiku-4.5" },
      {
        id: "anthropic/claude-opus-4-5",
        name: "opus-4.5",
        fileMimeTypes: ANTHROPIC_FILE_MIME_TYPES,
      },
    ],
  },
  {
    provider: "xai",
    models: [
      {
        id: "xai/grok-4-1-fast-non-reasoning",
        name: "grok-4-1-fast",
        fileMimeTypes: XAI_FILE_MIME_TYPES,
      },
      {
        id: "xai/grok-4-1",
        name: "grok-4-1",
        fileMimeTypes: XAI_FILE_MIME_TYPES,
      },
      {
        id: "xai/grok-3-mini",
        name: "grok-3-mini",
        fileMimeTypes: XAI_FILE_MIME_TYPES,
      },
    ],
  },
  {
    provider: "groq",
    models: [
      { id: "groq/moonshotai/kimi-k2-instruct", name: "kimi-k2-instruct" },
      {
        id: "groq/meta-llama/llama-4-scout-17b-16e-instruct",
        name: "llama-4-scout-17b",
      },
      { id: "groq/openai/gpt-oss-20b", name: "gpt-oss-20b" },
      { id: "groq/openai/gpt-oss-120b", name: "gpt-oss-120b" },
      { id: "groq/qwen/qwen3-32b", name: "qwen3-32b" },
    ],
  },
  {
    provider: "openRouter",
    models: [
      {
        id: "openrouter/openai/gpt-oss-20b:free",
        name: "gpt-oss-20b:free",
        toolCallUnsupported: true,
      },
      {
        id: "openrouter/qwen/qwen3-8b:free",
        name: "qwen3-8b:free",
        toolCallUnsupported: true,
      },
      {
        id: "openrouter/qwen/qwen3-14b:free",
        name: "qwen3-14b:free",
        toolCallUnsupported: true,
      },
      { id: "openrouter/qwen/qwen3-coder:free", name: "qwen3-coder:free" },
      {
        id: "openrouter/deepseek/deepseek-r1-0528:free",
        name: "deepseek-r1:free",
        toolCallUnsupported: true,
      },
      {
        id: "openrouter/deepseek/deepseek-chat-v3-0324:free",
        name: "deepseek-v3:free",
      },
      {
        id: "openrouter/google/gemini-2.0-flash-exp:free",
        name: "gemini-2.0-flash-exp:free",
        toolCallUnsupported: true,
        fileMimeTypes: GEMINI_FILE_MIME_TYPES,
      },
    ],
  },
];

// ============================================================================
// 模型实例缓存
// ============================================================================

const modelCache = new Map<string, LanguageModel>();

function getOrCreateModel(gatewayId: string): LanguageModel {
  let model = modelCache.get(gatewayId);
  if (!model) {
    model = gateway(gatewayId);
    modelCache.set(gatewayId, model);
  }
  return model;
}

// ============================================================================
// 查找表 - 用于快速查询模型配置
// ============================================================================

const modelConfigMap = new Map<string, ModelConfig>();
const modelIdByProviderAndName = new Map<string, string>();

for (const provider of modelConfigs) {
  for (const model of provider.models) {
    modelConfigMap.set(model.id, model);
    // 映射: "provider/name" -> "gateway-id"
    const key = `${provider.provider}/${model.name}`;
    modelIdByProviderAndName.set(key, model.id);
  }
}

// ============================================================================
// 导出的函数
// ============================================================================

const DEFAULT_MODEL_ID = "openai/gpt-4.1";

export const isToolCallUnsupportedModel = (model: LanguageModel): boolean => {
  const config = modelConfigMap.get(model.modelId);
  return config?.toolCallUnsupported ?? false;
};

export const getFilePartSupportedMimeTypes = (
  model: LanguageModel,
): readonly string[] => {
  const config = modelConfigMap.get(model.modelId);
  return config?.fileMimeTypes ?? DEFAULT_FILE_PART_MIME_TYPES;
};

export const customModelProvider = {
  modelsInfo: modelConfigs.map((provider) => ({
    provider: provider.provider,
    models: provider.models.map((model) => ({
      name: model.name,
      isToolCallUnsupported: model.toolCallUnsupported ?? false,
      isImageInputUnsupported: model.imageInputUnsupported ?? false,
      supportedFileMimeTypes: [...(model.fileMimeTypes ?? [])],
    })),
    hasAPIKey: true, // AI Gateway 统一管理 API Key
  })),

  getModel: (chatModel?: ChatModel): LanguageModel => {
    if (!chatModel) {
      return getOrCreateModel(DEFAULT_MODEL_ID);
    }

    const key = `${chatModel.provider}/${chatModel.model}`;
    const gatewayId = modelIdByProviderAndName.get(key);

    if (!gatewayId) {
      console.warn(`Model not found: ${key}, using default model`);
      return getOrCreateModel(DEFAULT_MODEL_ID);
    }

    return getOrCreateModel(gatewayId);
  },
};
