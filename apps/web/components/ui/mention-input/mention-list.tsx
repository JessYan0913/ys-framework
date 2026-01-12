'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { Check, ChevronRight } from 'lucide-react';

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export interface MentionListProps {
  items: KnowledgeBase[];
  command: (props: { id: string; label: string }) => void;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  documents: Document[];
}

export interface Document {
  id: string;
  name: string;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedKbIndex, setSelectedKbIndex] = useState(0);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [isSelectingDocument, setIsSelectingDocument] = useState(false);

  const selectKnowledgeBase = (index: number) => {
    const kb = props.items[index];
    if (kb) {
      setSelectedKb(kb);
      setSelectedDocIndex(0);
      setIsSelectingDocument(true);
    }
  };

  const selectDocument = (index: number) => {
    if (!selectedKb) return;

    const doc = selectedKb.documents[index];
    if (doc) {
      props.command({ id: `${selectedKb.id}:${doc.id}`, label: `${selectedKb.name}/${doc.name}` });
    }
  };

  const goBack = () => {
    setIsSelectingDocument(false);
    setSelectedKb(null);
  };

  const upHandler = () => {
    if (isSelectingDocument && selectedKb) {
      setSelectedDocIndex((selectedDocIndex + selectedKb.documents.length - 1) % selectedKb.documents.length);
    } else {
      setSelectedKbIndex((selectedKbIndex + props.items.length - 1) % props.items.length);
    }
  };

  const downHandler = () => {
    if (isSelectingDocument && selectedKb) {
      setSelectedDocIndex((selectedDocIndex + 1) % selectedKb.documents.length);
    } else {
      setSelectedKbIndex((selectedKbIndex + 1) % props.items.length);
    }
  };

  const enterHandler = () => {
    if (isSelectingDocument) {
      selectDocument(selectedDocIndex);
    } else {
      selectKnowledgeBase(selectedKbIndex);
    }
  };

  const backHandler = () => {
    if (isSelectingDocument) {
      goBack();
      return true;
    }
    return false;
  };

  useEffect(() => {
    setSelectedKbIndex(0);
    setIsSelectingDocument(false);
    setSelectedKb(null);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      if (event.key === 'Backspace' || event.key === 'Escape') {
        return backHandler();
      }

      return false;
    },
  }));

  if (isSelectingDocument && selectedKb) {
    return (
      <div className="z-50 max-h-[300px] w-[280px] overflow-y-auto rounded-lg border border-gray-100 bg-white text-sm text-gray-800 shadow-lg">
        <div className="flex items-center border-b border-gray-100 bg-gray-50 p-2">
          <button className="mr-2 cursor-pointer border-none bg-transparent text-xs text-blue-500" onClick={goBack}>
            ← Back to Knowledge Bases
          </button>
          <div className="text-sm font-medium text-gray-600">{selectedKb.name}</div>
        </div>
        {selectedKb.documents.length ? (
          <div className="max-h-[250px] overflow-y-auto">
            {selectedKb.documents.map((doc, index) => (
              <button
                className={`m-0 flex w-full items-center justify-between rounded-md border border-transparent bg-transparent p-2.5 text-left ${
                  index === selectedDocIndex ? 'bg-blue-50' : ''
                } cursor-pointer hover:bg-blue-50`}
                key={index}
                onClick={() => selectDocument(index)}
              >
                {doc.name}
                {index === selectedDocIndex && <Check className="ml-auto size-4" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-sm text-gray-500">No documents found</div>
        )}
      </div>
    );
  }

  return (
    <div className="z-50 max-h-[300px] w-[280px] overflow-y-auto rounded-lg border border-gray-100 bg-white text-sm text-gray-800 shadow-lg">
      <div className="flex items-center border-b border-gray-100 bg-gray-50 p-2">
        <div className="text-sm font-medium">Select Knowledge Base</div>
      </div>
      {props.items.length ? (
        <div className="max-h-[250px] overflow-y-auto">
          {props.items.map((kb, index) => (
            <button
              className={`m-0 flex w-full items-center justify-between rounded-md border border-transparent bg-transparent p-2.5 text-left ${
                index === selectedKbIndex ? 'bg-blue-50' : ''
              } cursor-pointer hover:bg-blue-50`}
              key={index}
              onClick={() => selectKnowledgeBase(index)}
            >
              {kb.name}
              <ChevronRight className="ml-auto size-4" />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center text-sm text-gray-500">No knowledge bases found</div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
