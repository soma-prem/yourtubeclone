import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { MapPin, Languages, Loader2, ThumbsUp, ThumbsDown, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  createdAt: string;
  city?: string;
  language?: string;
  likes?: number;
  dislikes?: number;
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
  const [translatedComments, setTranslatedComments] = useState<{ [key: string]: string }>({});
  const [translatingIds, setTranslatingIds] = useState<string[]>([]);

  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);

      const sortedComments = res.data.sort((a: Comment, b: Comment) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setComments(sortedComments);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateComment = async (commentId: string, action: 'like' | 'dislike') => {
    try {
      const res = await axiosInstance.patch(`/comment/like/${commentId}`, { action });
      
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        toast.info("Comment removed due to negative feedback.");
      } else if (res.data.updated) {
        const updatedComment = res.data.data;
        setComments((prev) => 
          prev.map((c) => c._id === commentId ? { ...c, likes: updatedComment.likes, dislikes: updatedComment.dislikes } : c)
        );
      }
    } catch (error) {
      console.error("Rating error:", error);
      toast.error("Could not rate comment.");
    }
  };

  const handleTranslate = async (comment: Comment) => {
    if (translatedComments[comment._id]) {
      const newTranslations = { ...translatedComments };
      delete newTranslations[comment._id];
      setTranslatedComments(newTranslations);
      return;
    }
    const targetLang = navigator.language.split('-')[0] || "en";
    const sourceLang = comment.language || "Autodetect";

    if (sourceLang === targetLang) {
        toast.info("Comment is already in your language.");
        return;
    }

    try {
      setTranslatingIds((prev) => [...prev, comment._id]);
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(comment.commentbody)}&langpair=${sourceLang}|${targetLang}`
      );
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        setTranslatedComments((prev) => ({ ...prev, [comment._id]: data.responseData.translatedText }));
      } else {
        toast.error("Could not translate comment.");
      }
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation service unavailable.");
    } finally {
      setTranslatingIds((prev) => prev.filter((id) => id !== comment._id));
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    let userCity = "Unknown";
    try {
      const locationRes = await fetch("https://ipapi.co/json/");
      const locationData = await locationRes.json();
      userCity = locationData.city || "Unknown";
    } catch (err) { console.error("Could not fetch location", err); }
    const userLang = navigator.language || "en";

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: userCity,
        language: userLang
      });
      if (res.data.comment) {
        const savedComment = res.data.data;
        const newCommentObj: Comment = { ...savedComment, usercommented: user.name || "Anonymous" };
        setComments([newCommentObj, ...comments]);
        setNewComment("");
        toast.success("Comment posted!");
      }
    } catch (error) { console.error(error); toast.error("Failed to post comment."); } 
    finally { setIsSubmitting(false); }
  };

  const handleEdit = (comment: Comment) => { setEditingCommentId(comment._id); setEditText(comment.commentbody); };
  
  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, { commentbody: editText });
      if (res.data) {
        const updatedCommentFromServer = res.data;
        setComments((prev) => prev.map((c) => c._id === editingCommentId ? { ...c, commentbody: updatedCommentFromServer.commentbody } : c));
        setEditingCommentId(null); setEditText(""); toast.success("Comment updated!");
      }
    } catch (error) { console.log(error); toast.error("Failed to update comment."); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) { setComments((prev) => prev.filter((c) => c._id !== id)); toast.success("Comment deleted."); }
    } catch (error) { console.log(error); toast.error("Failed to delete comment."); }
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4 mb-8">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNewComment("")} disabled={!newComment.trim()}>Cancel</Button>
              <Button onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmitting}>{isSubmitting ? "Posting..." : "Comment"}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-4 group">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback>{comment.usercommented?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{comment.usercommented}</span>
                <span className="text-xs text-muted-foreground">
                  {comment.createdAt && !isNaN(new Date(comment.createdAt).getTime()) ? formatDistanceToNow(new Date(comment.createdAt)) : "just now"} ago
                </span>
                {comment.city && comment.city !== "Unknown" && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3"/> {comment.city}
                    </span>
                )}
              </div>

              {editingCommentId === comment._id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleUpdateComment} disabled={!editText.trim()}>Save</Button>
                    <Button variant="ghost" onClick={() => { setEditingCommentId(null); setEditText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <p className="text-sm text-foreground leading-relaxed">{comment.commentbody}</p>
                  
                  {translatedComments[comment._id] && (
                    <div className="mt-2 p-2 bg-blue-500/10 rounded text-sm text-blue-300 border border-blue-500/20 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-1 mb-1 font-semibold text-xs"><Languages className="w-3 h-3" /> Translated:</div>
                        {translatedComments[comment._id]}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleRateComment(comment._id, 'like')} className="p-1.5 hover:bg-muted rounded-full transition-colors" title="Like">
                            <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-xs text-muted-foreground font-medium">{comment.likes || 0}</span>
                    </div>

                    <div className="flex items-center gap-1">
                         <button onClick={() => handleRateComment(comment._id, 'dislike')} className="p-1.5 hover:bg-muted rounded-full transition-colors" title="Dislike (2 dislikes removes comment)">
                            <ThumbsDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-xs text-muted-foreground font-medium">{comment.dislikes || 0}</span>
                    </div>

                    <button onClick={() => handleTranslate(comment)} className="text-xs font-medium text-muted-foreground hover:text-blue-400 flex items-center gap-1 ml-2 transition-colors" disabled={translatingIds.includes(comment._id)}>
                        {translatingIds.includes(comment._id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                        {translatedComments[comment._id] ? "Original" : "Translate"}
                    </button>

                    {comment.userid === user?._id && (
                        <div className="flex gap-2 text-xs font-medium text-muted-foreground ml-auto">
                            <button onClick={() => handleEdit(comment)} className="hover:text-foreground flex items-center gap-1">
                                <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => handleDelete(comment._id)} className="hover:text-red-600 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
