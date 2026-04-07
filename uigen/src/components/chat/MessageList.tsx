"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] px-6 text-center animate-in fade-in-0 duration-700">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-lg mb-6">
            <Bot className="h-8 w-8 text-blue-600" />
            <Sparkles className="h-4 w-4 text-blue-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        <h2 className="text-neutral-900 font-bold text-xl mb-3 tracking-tight">Start creating with AI</h2>
        <p className="text-neutral-600 text-base max-w-md leading-relaxed">Generate beautiful React components with conversation. I can help you build buttons, forms, cards, and entire interfaces.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto scroll-smooth">
      <div className="flex-1 px-4 sm:px-6 py-8">
        <div className="space-y-8 max-w-4xl mx-auto w-full">
          {messages.map((message, index) => (
            <div
              key={message.id || message.content}
              className={cn(
                "flex gap-4 animate-in slide-in-from-bottom-2 fade-in-0 duration-500",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-neutral-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center group">
                    <Bot className="h-5 w-5 text-neutral-700 group-hover:text-blue-600 transition-colors duration-300" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "flex flex-col gap-3 max-w-[85%] sm:max-w-[75%]",
                message.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "relative rounded-2xl px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
                  message.role === "user" 
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md hover:shadow-blue-200/50 border border-blue-500/20" 
                    : "bg-white/90 text-neutral-900 border border-neutral-200/50 shadow-sm hover:border-neutral-300/50 hover:bg-white"
                )}>
                <div className="text-sm leading-relaxed">
                  {message.parts ? (
                    <>
                      {message.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            return message.role === "user" ? (
                              <span key={partIndex} className="whitespace-pre-wrap font-medium">{part.text}</span>
                            ) : (
                              <MarkdownRenderer
                                key={partIndex}
                                content={part.text}
                                className="prose-sm prose-neutral max-w-none"
                              />
                            );
                          case "reasoning":
                            return (
                              <div key={partIndex} className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/50 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Reasoning</span>
                                </div>
                                <p className="text-sm text-amber-800 leading-relaxed">{part.reasoning}</p>
                              </div>
                            );
                          case "tool-invocation":
                            const tool = part.toolInvocation;
                            return (
                              <div key={partIndex} className="inline-flex items-center gap-3 mt-3 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl text-xs font-mono border border-slate-200/70 shadow-sm">
                                {tool.state === "result" && tool.result ? (
                                  <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm"></div>
                                    <span className="text-slate-700 font-medium">{tool.toolName}</span>
                                    <span className="text-emerald-600 text-xs">completed</span>
                                  </>
                                ) : (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span className="text-slate-700 font-medium">{tool.toolName}</span>
                                    <span className="text-blue-600 text-xs">running</span>
                                  </>
                                )}
                              </div>
                            );
                          case "source":
                            return (
                              <div key={partIndex} className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-xs font-medium text-slate-600 block mb-1">Source</span>
                                <code className="text-xs text-slate-700 font-mono">{JSON.stringify(part.source, null, 2)}</code>
                              </div>
                            );
                          case "step-start":
                            return partIndex > 0 ? (
                              <div key={partIndex} className="my-4 flex items-center">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent"></div>
                              </div>
                            ) : null;
                          default:
                            return null;
                        }
                      })}
                      {isLoading &&
                        message.role === "assistant" &&
                        messages.indexOf(message) === messages.length - 1 && (
                          <div className="flex items-center gap-3 mt-4 text-neutral-500 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm font-medium">Generating response...</span>
                            <div className="flex gap-1">
                              <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                          </div>
                        )}
                    </>
                  ) : message.content ? (
                    message.role === "user" ? (
                      <span className="whitespace-pre-wrap font-medium leading-relaxed">{message.content}</span>
                    ) : (
                      <MarkdownRenderer content={message.content} className="prose-sm prose-neutral max-w-none" />
                    )
                  ) : isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 ? (
                    <div className="flex items-center gap-3 text-neutral-500 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium">Generating response...</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center group border border-blue-500/20">
                  <User className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}