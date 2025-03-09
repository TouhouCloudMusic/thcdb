import { 
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@suid/material"
import { Button } from "@suid/material"
import { type JSX } from "solid-js"

export interface AlertDialogProps {
    open: boolean
    title: string
    content: string
    onClose: () => void
    onConfirm?: () => void
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
}

export function AlertDialog(props: AlertDialogProps) {
    const handleConfirm = () => {
        if (props.onConfirm) props.onConfirm();
        props.onClose();
    }

    const handleCancel = () => {
        if (props.onCancel) props.onCancel();
        props.onClose();
    }

    return (
        <Dialog open={props.open} onClose={props.onClose}>
            <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {props.content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>{props.cancelText ?? "取消"}</Button>
                <Button onClick={handleConfirm} autoFocus>{props.confirmText ?? "确定"}</Button>
            </DialogActions>
        </Dialog>
    )
}