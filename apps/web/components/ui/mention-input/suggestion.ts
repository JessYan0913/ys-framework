import type { MentionOptions } from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';

import MentionList, { type Document, type KnowledgeBase, type MentionListRef } from './mention-list';

// Cache for knowledge bases to avoid frequent API calls
let knowledgeBasesCache: KnowledgeBase[] = [];
let isLoading = false;

// Function to fetch knowledge bases from API
const fetchKnowledgeBases = async (): Promise<KnowledgeBase[]> => {
  try {
    isLoading = true;

    // Fetch real data from the API
    const response = await fetch('/api/');

    if (!response.ok) {
      console.error('Failed to fetch documents from API');
      return [];
    }

    const documents = await response.json();

    // Group documents by knowledge base
    const knowledgeBaseMap = new Map<string, { id: string; name: string; documents: Document[] }>();

    documents.forEach((doc: any) => {
      if (doc.knowledgeBaseId) {
        if (!knowledgeBaseMap.has(doc.knowledgeBaseId)) {
          knowledgeBaseMap.set(doc.knowledgeBaseId, {
            id: doc.knowledgeBaseId,
            name: doc.knowledgeBaseName || `知识库 ${doc.knowledgeBaseId}`,
            documents: [],
          });
        }

        // Add document to the knowledge base
        const kb = knowledgeBaseMap.get(doc.knowledgeBaseId);
        if (kb) {
          kb.documents.push({
            id: doc.id,
            name: doc.title || doc.filename || `文档 ${doc.id}`,
          });
        }
      }
    });

    // Convert map to array
    return Array.from(knowledgeBaseMap.values());
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return [];
  } finally {
    isLoading = false;
  }
};

// Define the correct types according to Tiptap's expectations
const suggestion: Omit<MentionOptions['suggestion'], 'editor'> = {
  items: ({ query }: { query: string }): KnowledgeBase[] => {
    // Start fetching knowledge bases if not already loading and the cache is empty
    if (knowledgeBasesCache.length === 0 && !isLoading) {
      fetchKnowledgeBases().then((data) => {
        knowledgeBasesCache = data;
      });
    }

    // Filter knowledge bases by query
    if (!query) return knowledgeBasesCache;

    return knowledgeBasesCache.filter((kb) => kb.name.toLowerCase().includes(query.toLowerCase()));
  },

  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let popup: Instance[];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        // If cache is empty, initiate data fetching
        if (knowledgeBasesCache.length === 0 && !isLoading) {
          fetchKnowledgeBases().then((data) => {
            knowledgeBasesCache = data;
            if (component) {
              // Update the items in the component props
              component.updateProps({
                ...props,
                items: knowledgeBasesCache,
              });
            }
          });
        }

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props) || false;
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};

export default suggestion;
